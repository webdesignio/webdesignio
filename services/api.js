'use strict'

const express = require('express')
const mongoose = require('mongoose')
const error = require('http-errors')

const { handleJSONError } = require('../lib/error_handlers')
const websiteAPI = require('./website_api')

const api = module.exports = express()
api.use('/tokens', require('./tokens'))
api.post('/websites/deploy', require('./deploy'))
api.post('/websites/build', require('./build_website'))
api.use('/meta', require('./meta'))
api.use('/websites', websiteAPI({
  collection: mongoose.connection.collections.websites
}))
api.use(require('./records'))
api.use((req, res, next) =>
  next(error(404, 'This endpoint doesn\'t exist'))
)
api.use(handleJSONError)
