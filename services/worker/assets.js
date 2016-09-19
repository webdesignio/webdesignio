'use strict'

const { dirname } = require('path')
const fs = require('fs')
const yauzl = require('yauzl')
const tmp = require('tmp')
const mkdirp = require('mkdirp')
const Bluebird = require('bluebird')

const mkdirpAsync = Bluebird.promisify(mkdirp)

exports.loadAssets = loadAssets
exports.extractAssets = extractAssets

function loadAssets ({ website, driver }) {
  return new Promise((resolve, reject) => {
    tmp.file((err, path) => {
      if (err) return reject(err)
      resolve(path)
    })
  })
  .then(tmpPath =>
    new Promise((resolve, reject) =>
      driver({ websiteID: website })
        .on('error', reject)
        .pipe(fs.createWriteStream(tmpPath))
        .on('error', reject)
        .on('close', () => resolve(tmpPath))
    )
  )
}

function extractAssets ({ tmpPath, output, website, language }) {
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
      zipFile.on('end', () => Promise.all(promises).then(() => resolve()))
      zipFile.readEntry()
    })
  )
}
