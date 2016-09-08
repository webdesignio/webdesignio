'use strict'

const express = require('express')
const mongoose = require('mongoose')
const error = require('http-errors')
const Grid = require('gridfs-stream')
const { send } = require('micro')
const config = require('config')
const kue = require('kue')

const { handleJSONError } = require('../lib/error_handlers')
const createTokenAPI = require('./token_api')
const createDeploymentAPI = require('./deployment_api')
const createWebsiteBuildingAPI = require('./website_building_api')
const createMetaAPI = require('./meta_api')
const createWebsiteAPI = require('./website_api')
const createRecordAPI = require('./record_api')

mongoose.model('objects', {})
mongoose.model('pages', {})

const queue = kue.createQueue({ redis: config.get('redis') })
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
const tokenAPI = micro(createTokenAPI({ secret: config.get('secret'), users }))
const deploymentAPI = micro(createDeploymentAPI({ getGfs }))
const websiteBuildingAPI = micro(createWebsiteBuildingAPI({ queue }))
const metaAPI = micro(createMetaAPI({ getGfs }))
const websiteAPI = micro(createWebsiteAPI({ websites }))
const recordAPI = micro(createRecordAPI({ pages, objects }))
const api = module.exports = express()
api.use('/tokens', tokenAPI)
api.use('/websites/deploy', deploymentAPI)
api.use('/websites/build', websiteBuildingAPI)
api.use('/meta', metaAPI)
api.use('/websites', websiteAPI)
api.use(recordAPI)
api.use((req, res, next) =>
  next(error(404, 'This endpoint doesn\'t exist'))
)
api.use(handleJSONError)
