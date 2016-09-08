'use strict'

const { log } = require('util')
const http = require('http')
const express = require('express')
const mongoose = require('mongoose')
const morgan = require('morgan')
const through = require('through')
const kue = require('kue')
const config = require('config')
const cors = require('cors')
const Grid = require('gridfs-stream')
const { send } = require('micro')

const apiAuthorization = require('./services/api_authorization')
const extractWebsiteID = require('./services/extract_website')
const appAuthorization = require('./services/app_authorization')
const app = require('./services/app')
const createTokenAPI = require('./services/token_api')
const createDeploymentAPI = require('./services/deployment_api')
const createWebsiteBuildingAPI = require('./services/website_building_api')
const createMetaAPI = require('./services/meta_api')
const createWebsiteAPI = require('./services/website_api')
const createRecordAPI = require('./services/record_api')
const createAPI = require('./services/api')

mongoose.Promise = Promise
mongoose.connect(config.get('mongodb'))

const micro = fn =>
  (req, res, next) =>
    fn(req, res)
      .then(v => v != null ? send(res, 200, v) : null)
      .catch(next)

// Make sure gfs is lazily created
const secret = config.get('secret')
const { users, websites, pages, objects } = mongoose.connection.collections
let gfs = null
const getGfs = () => {
  if (gfs) return gfs
  return (gfs = Grid(mongoose.connection.db, mongoose.mongo))
}
const queue = kue.createQueue({ redis: config.get('redis') })
const tokenAPI = createTokenAPI({ secret, users })
const deploymentAPI = createDeploymentAPI({ getGfs })
const websiteBuildingAPI = createWebsiteBuildingAPI({ queue })
const metaAPI = createMetaAPI({ getGfs })
const websiteAPI = createWebsiteAPI({ websites })
const recordAPI = createRecordAPI({ pages, objects })
const api = micro(createAPI({
  tokenAPI,
  deploymentAPI,
  websiteBuildingAPI,
  metaAPI,
  websiteAPI,
  recordAPI
}))

const frontend = express()
const loggerFormat = frontend.get('env') === 'development'
  ? 'tiny'
  : 'short'
frontend.use(morgan(loggerFormat, {
  stream: through(data => log(data.slice(0, -1)))
}))
frontend.use('/api/v1', cors())
frontend.use('/api/v1', require('./services/api_auth'))
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
  log('server listening on port ' + server.address().port)
})
