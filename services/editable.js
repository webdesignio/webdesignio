'use strict'

const express = require('express')
const mongoose = require('mongoose')
const Grid = require('gridfs-stream')
const bunyan = require('bunyan')
const error = require('http-errors')

const editable = module.exports = express()
const fleet = Object.assign({},
  { log: bunyan.createLogger({ name: 'editable' }) },
  require('./plugins/files')
)

editable.get('/', (req, res, next) => {
  const website = req.headers['x-website']
  if (!website) return next()
  servePage({ website, id: 'index' }, res, next)
})

editable.get('/:id', (req, res, next) => {
  const website = req.headers['x-website']
  if (!website) return next()
  const { id } = req.params
  servePage({ website, id }, res, next)
})

editable.get('/:type/:id', (req, res, next) => {
  const website = req.headers['x-website']
  if (!website) return next()
  const { type } = req.params
  serveObject({ website, type }, res, next)
})

function servePage ({ website, id }, res, next) {
  fleet.log.info('serve page', id)
  const query = {
    'metadata.website': website,
    filename: `pages/${id}`
  }
  serveFile({ query }, res, next)
}

function serveObject ({ website, type }, res, next) {
  fleet.log.info('serve object', type)
  const query = {
    'metadata.website': website,
    filename: `objects/${type}`
  }
  serveFile({ query }, res, next)
}

function serveFile ({ query }, res, next) {
  const gfs = Grid(mongoose.connection.db, mongoose.mongo)
  fleet.getFile(query)
    .then(file => file || Promise.reject(error(404)))
    .then(({ _id }) => {
      const readStream = gfs.createReadStream({ _id })
      res.writeHeader(200, { 'Content-Type': 'text/html' })
      readStream
        .on('error', next)
        .pipe(res)
    })
    .catch(next)
}
