'use strict'

const util = require('util')
const co = require('co')
const Busboy = require('busboy')
const { send, createError } = require('micro')
const meter = require('stream-meter')

const debuglog = util.debuglog('asset_api')

module.exports = createAssetAPI

function createAssetAPI ({ s3 }) {
  const driver = process.env.NODE_ENV === 'production'
    ? createAWSDriver({ s3 })
    : createFSDriver({ uploadDir: 'assets' })
  debuglog(
    'using',
    process.env.NODE_ENV === 'production'
      ? 'aws driver'
      : 'fs driver'
  )
  return co.wrap(function * assetAPI (req, res) {
    if (!req.headers['x-website']) throw createError(400)
    if (req.method === 'POST') {
      const { Bytes: bytes } = yield uploadFile(req, driver)
      send(res, 200, { bytes })
      return null
    } else {
      throw createError(405)
    }
  })
}

function uploadFile (req, driver) {
  return new Promise((resolve, reject) => {
    const busboy = new Busboy({ headers: req.headers })
    let fileReceived = false
    busboy.once('file', (fieldname, file, filename) => {
      debuglog('\'file\' event on busboy', file.size)
      fileReceived = true
      const m = meter()
      resolve(
        driver({ file: m, request: req })
          .then(res => Object.assign({}, res, { Bytes: m.bytes }))
      )
      file.pipe(m)
    })
    busboy.once('error', reject)
    busboy.once('finish', () => {
      debuglog('\'finish\' event on busboy')
      if (!fileReceived) reject(createError(400), 'No file received')
    })
    req.pipe(busboy)
  })
}

function createFSDriver ({ uploadDir }) {
  const fs = require('fs')
  const mkdirp = require('mkdirp')
  return ({ file, request: req }) =>
    new Promise((resolve, reject) => {
      mkdirp(uploadDir, err => {
        if (err) console.log(err)
        file.pipe(
          fs.createWriteStream(`${uploadDir}/${req.headers['x-website']}`)
            .on('error', err => reject(err))
            .on('close', () => resolve({}))
        )
      })
    })
}

function createAWSDriver ({ s3 }) {
  return ({ file: m, request: req }) =>
    new Promise((resolve, reject) => {
      const params = {
        Key: `assets/${req.headers['x-website']}`,
        ACL: 'private',
        Body: m
      }
      debuglog('upload', Object.assign({}, params, { Body: '<Stream>' }))
      s3.upload(params, (err, data) => {
        if (err) return reject(err)
        debuglog(data)
        debuglog('uploaded', m.bytes, 'bytes')
        resolve(data)
      })
    })
}
