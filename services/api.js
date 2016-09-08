'use strict'

const express = require('express')
const mongoose = require('mongoose')
const error = require('http-errors')
const Grid = require('gridfs-stream')
const { send } = require('micro')
const config = require('config')

const { handleJSONError } = require('../lib/error_handlers')
const websiteAPI = require('./website_api')

mongoose.model('objects', {})
mongoose.model('pages', {})

let gfs = null

// Make sure gfs is lazily created
const getGfs = () => {
  if (gfs) return gfs
  return (gfs = Grid(mongoose.connection.db, mongoose.mongo))
}
const micro = fn =>
  (req, res, next) => {
    req.url = req.originalUrl
    return fn(req, res)
      .then(v => v != null ? send(res, 200, v) : null)
      .catch(next)
  }
const { users, websites, pages, objects } = mongoose.connection.collections
const api = module.exports = express()
api.use('/tokens', micro(require('./token_api')({ secret: config.get('secret'), users })))
api.use('/websites/deploy', micro(require('./deployment_api')({ getGfs })))
api.post('/websites/build', require('./build_website'))
api.use('/meta', require('./meta'))
api.use('/websites', websiteAPI({ collection: websites }))
api.use(require('./record_api')({ pages, objects }))
api.use((req, res, next) =>
  next(error(404, 'This endpoint doesn\'t exist'))
)
api.use(handleJSONError)
