'use strict'

const http = require('http')
const express = require('express')
const mongoose = require('mongoose')
const morgan = require('morgan')
const bunyan = require('bunyan')
const through = require('through')
const kue = require('kue')
const config = require('config')
const throng = require('throng')
const cors = require('cors')
require('async-to-gen/register')

const apiAuthorization = require('./api_authorization')
const api = require('./api')
const extractWebsiteID = require('./extract_website')
const appAuthorization = require('./app_authorization')
const app = require('./app')

const concurrency = process.env.WEB_CONCURRENCY || 1

throng(parseInt(concurrency), () => {
  mongoose.Promise = Promise
  mongoose.connect(config.get('mongodb'))

  const { websites, users } = mongoose.connection.collections
  const log = bunyan.createLogger({ name: 'frontend' })
  const frontend = express()
  const loggerFormat = frontend.get('env') === 'development'
    ? 'tiny'
    : 'short'
  frontend.use(morgan(loggerFormat, {
    stream: through(data => log.info(data))
  }))
  frontend.use('/api/v1', cors())
  frontend.use('/api/v1', require('./api_auth'))
  frontend.use('/api/v1', apiAuthorization(api))
  frontend.use(
    extractWebsiteID(
      appAuthorization({
        app,
        secret: config.get('secret'),
        errorPages: config.get('errorPages'),
        websites,
        users
      })
    )
  )
  const server = http.createServer(frontend)
  if (frontend.get('env') === 'development') {
    kue.app.listen(3001)
  }
  server.listen(process.env.PORT || 3000, () => {
    log.info('engine running on port ' + server.address().port)
  })
})
