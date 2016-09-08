'use strict'

const { dirname } = require('path')
const fs = require('fs')
const vm = require('vm')
const mongoose = require('mongoose')
const Grid = require('gridfs-stream')
const { createStore } = require('redux')
const cheerio = require('cheerio')
const Bluebird = require('bluebird')
const mkdirp = require('mkdirp')
const find = require('lodash/fp/find')
const yauzl = require('yauzl')
const tmp = require('tmp')
const reduce = require('@webdesignio/floorman/reducers').default
const kue = require('kue')
const config = require('config')
const throng = require('throng')
const writeFileAsync = Bluebird.promisify(fs.writeFile)
const mkdirpAsync = Bluebird.promisify(mkdirp)
const unlinkAsync = Bluebird.promisify(fs.unlink)

let fleet

const concurrency = process.env.WEB_CONCURRENCY || 1
throng(parseInt(concurrency), () => {
  mongoose.Promise = Promise
  mongoose.connect(config.get('mongodb'))

  fleet = Object.assign(
    {},
    require('./plugins/websites'),
    require('./plugins/components'),
    require('./plugins/files'),
    require('./plugins/objects'),
    require('./plugins/pages'),
    require('./plugins/drivers')
  )

  const queue = kue.createQueue({ redis: config.get('redis') })
  queue.process('build_website', ({ data: { id } }, done) => {
    console.log('starting build', id)
    buildWebsite({ id })
      .then(() => done())
      .catch(err => {
        console.log(err.stack)
        done(err)
      })
  })
  console.log('worker running')
})

function buildWebsite ({ id: website }) {
  console.log('building', website)
  return new Promise((resolve, reject) => {
    tmp.dir({ unsafeCleanup: true }, (err, tmpPath, cleanup) => {
      if (err) return reject(err)
      resolve({ tmpPath, cleanup, website })
    })
  })
  .then(startBuild)
}

function startBuild ({ website, tmpPath, cleanup }) {
  return Promise.all([
    fleet.getWebsite({ id: website }),
    fleet.getComponents({
      'metadata.website': website,
      'metadata.type': 'components'
    })
  ])
  .then(([website, components]) =>
    Promise.all([
      Promise.resolve({
        website,
        outputs: website.languages.map(language =>
          `${tmpPath}/${language}`
        )
      }),
      loadAssets({ website: website._id })
        .then(assetTmpPath =>
          Promise.all(
            website.languages
              .map(language =>
                extractAssets({
                  output: tmpPath,
                  tmpPath: assetTmpPath,
                  language,
                  website: website._id
                })
              )
          )
          .then(() => unlinkAsync(assetTmpPath))
        ),
      buildPages({ website, components, tmpPath }),
      buildObjects({ website, components, tmpPath })
    ])
    .then(([{ website, outputs }]) => {
      if (website.config.driver) {
        console.log('sending assets to cdn', website.config.driver)
        return Promise.all(
          website.languages.map((language, i) =>
            fleet.runDriver({
              name: website.config.driver,
              website,
              language,
              output: outputs[i]
            })
          )
        )
      }
    })
    .then(() => cleanup())
  )
}

function buildPages ({ website, components, tmpPath }) {
  return Promise.all([
    fleet.getPages({ website: website._id, $select: '_id' }),
    fleet.getFiles({
      'metadata.website': website._id,
      'metadata.type': 'pages'
    })
  ])
  .then(([pages, files]) =>
    files.map(file => {
      const name = file.filename.split('/')[1]
      const page = find({ name }, pages)
      return page != null
        ? page
        : { name, fields: {}, website: website._id }
    })
  )
  .then(pages =>
    Promise.all(
      pages.map(page =>
        Promise.all(
          website.languages.map(language =>
            buildPage({
              name: page.name,
              website: website._id,
              language,
              components,
              tmpPath
            })
          )
        )
      )
    )
  )
}

function buildObjects ({ website, components, tmpPath }) {
  return fleet.getObjects({ website: website._id, $select: '_id' })
    .then(objects =>
      Promise.all(
        objects.map(object =>
          Promise.all(
            website.languages.map(language =>
              buildObject({
                id: object._id,
                website: website._id,
                language,
                components,
                tmpPath
              })
            )
          )
        )
      )
    )
}

function loadAssets ({ website }) {
  const gfs = Grid(mongoose.connection.db, mongoose.mongo)
  return new Promise((resolve, reject) => {
    tmp.file((err, path) => {
      if (err) return reject(err)
      resolve(path)
    })
  })
  .then(tmpPath =>
    new Promise((resolve, reject) => {
      console.log('saving assets on harddisk', website, tmpPath)
      console.log('loading assets', { filename: 'assets', 'metadata.website': website })
      gfs.files.findOne({ filename: 'assets', 'metadata.website': website })
        .then(file => {
          if (!file) throw new Error('No assets available!')
          gfs.createReadStream({ _id: file._id })
            .on('error', reject)
            .pipe(fs.createWriteStream(tmpPath))
            .on('error', reject)
            .on('close', () => resolve(tmpPath))
        })
    })
  )
}

function extractAssets ({ tmpPath, output, website, language }) {
  console.log('extracting assets to', output)
  return new Promise((resolve, reject) => {
    yauzl.open(tmpPath, { lazyEntries: true }, (err, zipFile) => {
      if (err) return reject(err)
      resolve(zipFile)
    })
  })
  .then(zipFile =>
    new Promise((resolve, reject) => {
      const promises = []
      zipFile.on('entry', entry => {
        const path = `${output}/${language}/${entry.fileName}`
        promises.push(
          mkdirpAsync(dirname(path))
            .then(() =>
              new Promise((resolve, reject) => {
                zipFile.openReadStream(entry, (err, stream) => {
                  if (err) return reject(err)
                  resolve(stream)
                })
              })
            )
            .then(stream =>
              new Promise((resolve, reject) => {
                stream
                  .on('error', reject)
                  .pipe(fs.createWriteStream(path))
                  .on('error', reject)
                  .on('close', resolve)
              })
            )
            .then(() => zipFile.readEntry())
        )
      })
      zipFile.on('end', () => {
        console.log('end of archive, waiting for streams to settle')
        Promise.all(promises).then(() => resolve())
      })
      zipFile.readEntry()
    })
  )
}

function buildPage ({ name, website, components, language, tmpPath }) {
  return fleet.getPage({ name, website })
    .then(record =>
      buildRecord({
        filename: `pages/${record.name}`,
        record,
        language,
        components
      })
      .then(ctx => {
        const output = buildContext(ctx)
        return writeOutput(
          `${tmpPath}/${language}/` +
          (record.name === 'index'
            ? 'index.html'
            : `${record.name}/index.html`),
          output
        )
      })
    )
}

function buildObject ({ id, website, components, language, tmpPath }) {
  return fleet.getObject({ id, website })
    .then(record =>
      buildRecord({
        filename: `objects/${record.type}`,
        record,
        language,
        components
      })
      .then(ctx => {
        const output = buildContext(ctx)
        return writeOutput(
          `${tmpPath}/${language}/${record.type}/${record._id}/index.html`,
          output
        )
      })
    )
}

function buildRecord ({ filename, record, components, language }) {
  console.log('build record')
  console.log(record.toJSON())
  const gfs = Grid(mongoose.connection.db, mongoose.mongo)
  return Promise.all([
    fleet.getWebsite({ id: record.website }),
    fleet.getFile({
      filename,
      'metadata.website': record.website
    })
  ])
  .then(([website, template]) =>
    ({
      website,
      record,
      meta: template.metadata,
      components,
      language,
      input: gfs.createReadStream({ _id: template._id })
    })
  )
  .then(ctx =>
    new Promise((resolve, reject) => {
      let buffer = ''
      ctx.input
        .on('error', reject)
        .on('data', d => { buffer += d })
        .on('end', () =>
          resolve(Object.assign({}, ctx, { input: buffer }))
        )
        .resume()
    })
  )
}

function buildContext ({ components, record, website, meta, language, input }) {
  const $ = cheerio.load(input)
  $('[data-webdesignio-remove]').remove()
  $('[data-component]').each(function () {
    const componentName = $(this).attr('data-component')
    const component = components[componentName]
    if (!component) return
    const props = JSON.parse(($(this).attr('data-props') || '{}'))
    $(this).attr('data-component', null)
    $(this).attr('data-props', null)
    $(this).html(renderComponent({ component, props }))
  })
  return $.html()

  function renderComponent ({ component, props, stream }) {
    const m = { exports: {} }
    const state = {
      locals: Object.assign(
        { noLangFields: [] },
        meta, { fields: record.fields }
      ),
      globals: { noLangFields: website.noLangFields, fields: website.fields },
      defaultLanguage: website.defaultLanguage,
      languages: website.languages,
      currentLanguage: language,
      isEditable: false
    }
    const store = createStore(reduce, state)
    const context = vm.createContext({
      module: m,
      exports: m.exports,
      __PROPS__: Object.assign({}, props, { store })
    })
    vm.runInContext(
      `${component}\n__OUT__ = module.exports(__PROPS__)`,
      context,
      { timeout: 1000 }
    )
    return context.__OUT__
  }
}

function writeOutput (path, output) {
  return mkdirpAsync(dirname(path))
    .then(() => writeFileAsync(path, output))
}
