'use strict'

const mongoose = require('mongoose')
const kue = require('kue')
const config = require('config')
const Grid = require('gridfs-stream')
const micro = require('micro')
const morgan = require('morgan')
const co = require('co')
const Bluebird = require('bluebird')
const createCORS = require('cors')

const createTokenAPI = require('./services/token_api')
const createDeploymentAPI = require('./services/deployment_api')
const createWebsiteBuildingAPI = require('./services/website_building_api')
const createMetaAPI = require('./services/meta_api')
const createWebsiteAPI = require('./services/website_api')
const createRecordAPI = require('./services/record_api')
const createAPI = require('./services/api')
const createAuthorization = require('./services/auth')
const createRequestExtractor = require('./services/request_extractor')
const createLogin = require('./services/login')
const createEditable = require('./services/editable')
const createApp = require('./services/app')

mongoose.Promise = Promise
mongoose.connect(config.get('mongodb'))
mongoose.model('users', {})
mongoose.model('websites', {})
mongoose.model('objects', {})
mongoose.model('pages', {})

// Make sure gfs is lazily created
const secret = config.get('secret')
const errorPages = config.get('errorPages')
const { users, websites, pages, objects } = mongoose.connection.collections
let gfs = null
const getGfs = () => {
  if (gfs) return gfs
  return (gfs = Grid(mongoose.connection.db, mongoose.mongo))
}
const queue = kue.createQueue({ redis: config.get('redis') })
const app = createRequestExtractor({
  services: {
    upstream: createAuthorization({
      secret,
      errorPages,
      collections: { users, websites },
      services: {
        app: createApp({
          services: {
            api: createAPI({
              tokenAPI: createTokenAPI({ secret, users }),
              deploymentAPI: createDeploymentAPI({ getGfs }),
              websiteBuildingAPI: createWebsiteBuildingAPI({ queue }),
              metaAPI: createMetaAPI({ getGfs }),
              websiteAPI: createWebsiteAPI({ websites }),
              recordAPI: createRecordAPI({ pages, objects })
            }),
            login: createLogin({ getGfs, errorPages }),
            editable: createEditable({ getGfs, errorPages })
          }
        })
      }
    })
  }
})

const loggerFormat = process.env.NODE_ENV === 'production'
  ? 'short'
  : 'dev'
const logger = Bluebird.promisify(morgan(loggerFormat))
const cors = Bluebird.promisify(createCORS())
const server = micro(co.wrap(function * frontend (req, res) {
  yield logger(req, res)
  if (req.url.match(/^\/api\//)) yield cors(req, res)
  return yield app(req, res)
}))
if (process.env.NODE_ENV === 'production') kue.app.listen(3001)
server.listen(process.env.PORT || 3000, () => {
  console.log('server listening on port ' + server.address().port)
})
