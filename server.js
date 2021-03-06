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
const AWS = require('aws-sdk')

const createURLNormalization = require('./services/url_normalization')
const createTokenAPI = require('./services/token_api')
const createDeploymentAPI = require('./services/deployment_api')
const createWebsiteBuildingAPI = require('./services/website_building_api')
const createMetaAPI = require('./services/meta_api')
const createWebsiteUpsertionAPI = require('./services/website_upsertion_api')
const createWebsiteAPI = require('./services/website_api')
const createRecordAPI = require('./services/record_api')
const createAssetAPI = require('./services/asset_api')
const createAPI = require('./services/api')
const createAuthorization = require('./services/auth')
const createRequestExtractor = require('./services/request_extractor')
const createLogin = require('./services/login')
const createEditable = require('./services/editable')
const createApp = require('./services/app')
const createPlanInspector = require('./services/plan_inspector')
const createUserUpsertionAPI = require('./services/user_upsertion_api')
const createUserAPI = require('./services/user_api')
const createAPIV2 = require('./services/api_v2')
const createWebsiteAPIV2 = require('./services/website_api_v2')
const createWebsiteQueryAPI = require('./services/website_query_api')
const createServiceAPI = require('./services/service_api')
const createVoucherAPI = require('./services/voucher_api')
const createSlackNotifier = require('./services/slack_notifier')
const createPageAPI = require('./services/page_api')
const createPageQueryAPI = require('./services/page_query_api')
const createObjectAPI = require('./services/object_api')
const createObjectQueryAPIV2 = require('./services/object_query_api_v2.js')
const createProtector = require('./services/protector.js')

mongoose.Promise = Promise
mongoose.connect(config.get('mongodb'))
mongoose.model('users', {})
mongoose.model('websites', {})
mongoose.model('objects', {})
mongoose.model('pages', {})
mongoose.model('services', {})

// Make sure gfs is lazily created
const secret = config.get('secret')
const errorPages = config.get('errorPages')
const s3 = new AWS.S3({
  signatureVersion: 'v4',
  params: { Bucket: process.env.AWS_S3_BUCKET }
})
const { users, websites, pages, objects, services } = mongoose.connection.collections
const collections = { users, websites, pages, objects, services }
let gfs = null
const getGfs = () => {
  if (gfs) return gfs
  return (gfs = Grid(mongoose.connection.db, mongoose.mongo))
}
const queue = kue.createQueue({ redis: config.get('redis') })
const slackNotifier = createSlackNotifier({ url: process.env.SLACK_MESSAGE_URL })
const app = createURLNormalization({
  services: {
    upstream: createProtector({
      services: {
        upstream: createRequestExtractor({
          services: {
            upstream: createAuthorization({
              secret,
              errorPages,
              collections: { users, websites },
              services: {
                upstream: createPlanInspector({
                  collections,
                  services: {
                    upstream: createApp({
                      services: {
                        api: createAPI({
                          tokenAPI: createTokenAPI({ secret, users }),
                          deploymentAPI: createDeploymentAPI({ getGfs }),
                          websiteBuildingAPI: createWebsiteBuildingAPI({ queue }),
                          metaAPI: createMetaAPI({ getGfs }),
                          websiteAPI: createWebsiteAPI({
                            collections,
                            services: {
                              websiteUpsertionAPI: createWebsiteUpsertionAPI({ collections })
                            }
                          }),
                          recordAPI: createRecordAPI({ pages, objects }),
                          assetAPI: createAssetAPI({ s3, collections }),
                          userAPI: createUserAPI({
                            services: {
                              userUpsertionAPI: createUserUpsertionAPI({
                                collections,
                                services: { slackNotifier }
                              })
                            }
                          })
                        }),
                        apiV2: createAPIV2({
                          services: {
                            websiteAPI: createWebsiteAPIV2({
                              services: {
                                websiteQueryAPI: createWebsiteQueryAPI({ collections }),
                                serviceAPI: createServiceAPI({
                                  collections,
                                  services: {
                                    voucherAPI: createVoucherAPI({ collections })
                                  }
                                }),
                                pageAPI: createPageAPI({
                                  services: {
                                    pageQueryAPI: createPageQueryAPI({ collections })
                                  }
                                }),
                                objectAPI: createObjectAPI({
                                  services: {
                                    objectQueryAPI: createObjectQueryAPIV2({ collections })
                                  }
                                })
                              }
                            })
                          }
                        }),
                        login: createLogin({ getGfs, errorPages }),
                        editable: createEditable({ getGfs, errorPages })
                      }
                    })
                  }
                })
              }
            })
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
  req.originalUrl = req.url
  yield logger(req, res)
  if (req.url.match(/^\/api\//)) yield cors(req, res)
  return yield app(req, res)
}))
if (process.env.NODE_ENV === 'production') kue.app.listen(3001)
server.listen(process.env.PORT || 3000, () => {
  console.log('server listening on port ' + server.address().port)
})
