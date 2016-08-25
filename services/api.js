'use strict'

const express = require('express')
const error = require('http-errors')

const { handleJSONError } = require('../lib/error_handlers')

const api = module.exports = express()
api.use('/tokens', require('./tokens'))
api.post('/websites/:website/deploy', require('./deploy'))
api.post('/websites/:website/build', require('./build_website'))
api.use('/meta', require('./meta'))
api.use('/websites', require('./websites'))
api.use(require('./records'))
api.use((req, res, next) =>
  next(error(404, 'This endpoint doesn\'t exist'))
)
api.use(handleJSONError)
