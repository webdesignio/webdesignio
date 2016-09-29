'use strict'

const util = require('util')
const { dirname } = require('path')
const fs = require('fs')
const mongoose = require('mongoose')
const Grid = require('gridfs-stream')
const Bluebird = require('bluebird')
const mkdirp = require('mkdirp')
const find = require('lodash/fp/find')
const tmp = require('tmp')
const kue = require('kue')
const config = require('config')
const throng = require('throng')
const AWS = require('aws-sdk')
const writeFileAsync = Bluebird.promisify(fs.writeFile)
const mkdirpAsync = Bluebird.promisify(mkdirp)
const unlinkAsync = Bluebird.promisify(fs.unlink)

const { buildContext } = require('./build')
const { loadAssets, extractAssets } = require('./assets')
const createSlackNotifier = require('../slack_notifier')

const debuglog = util.debuglog('worker')
let fleet

const concurrency = process.env.WEB_CONCURRENCY || 1
throng(parseInt(concurrency), () => {
  mongoose.Promise = Promise
  mongoose.connect(config.get('mongodb'))

  fleet = Object.assign(
    {},
    require('../plugins/websites'),
    require('../plugins/components'),
    require('../plugins/files'),
    require('../plugins/objects'),
    require('../plugins/pages'),
    require('../plugins/drivers')
  )

  const slackNotifier = createSlackNotifier({ url: process.env.SLACK_MESSAGE_URL })
  const assetDriver = process.env.NODE_ENV === 'production'
    ? createAWSDriver({
      s3: new AWS.S3({
        signatureVersion: 'v4',
        params: { Bucket: process.env.AWS_S3_BUCKET }
      })
    })
    : createFSDriver({ uploadDir: 'assets' })
  debuglog(
    'using',
    process.env.NODE_ENV === 'production'
      ? 'aws driver'
      : 'fs driver'
  )
  const queue = kue.createQueue({ redis: config.get('redis') })
  queue.process('build_website', ({ id: jobID, data: { id } }, done) => {
    slackNotifier({
      username: 'builder',
      icon_emoji: ':ant:',
      text: `[website ${id}]: :rocket: Starting build #${jobID}`
    })
    buildWebsite({ assetDriver, id })
      .then(() => {
        slackNotifier({
          username: 'builder',
          icon_emoji: ':ant:',
          text: `[website ${id}]: :tada: Build #${jobID} finished successfully`
        })
        done()
      })
      .catch(err => {
        console.log(err.stack)
        slackNotifier({
          username: 'builder',
          icon_emoji: ':ant:',
          text: `[website ${id}]: :boom: Build #${jobID} failed!`
        })
        done(err)
      })
  })
  console.log('worker running')
})

function buildWebsite ({ assetDriver, id: website }) {
  console.log('building', website)
  return new Promise((resolve, reject) => {
    tmp.dir({ unsafeCleanup: true }, (err, tmpPath, cleanup) => {
      if (err) return reject(err)
      resolve({ tmpPath, cleanup, website, assetDriver })
    })
  })
  .then(startBuild)
  .then(() => {
    console.log('successfully published', website)
  })
}

function startBuild ({ assetDriver, website, tmpPath, cleanup }) {
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
      loadAssets({ driver: assetDriver, website: website._id })
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
        debuglog('sending assets to cdn', website.config.driver)
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
    fleet.getPages({ website: website._id }),
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
  debuglog('build record')
  debuglog(record.toJSON())
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

function writeOutput (path, output) {
  return mkdirpAsync(dirname(path))
    .then(() => writeFileAsync(path, output))
}

function createFSDriver ({ uploadDir }) {
  return ({ websiteID }) => fs.createReadStream(`${uploadDir}/${websiteID}`)
}

function createAWSDriver ({ s3 }) {
  return ({ websiteID }) =>
    s3.getObject({ Key: `assets/${websiteID}` }).createReadStream()
}
