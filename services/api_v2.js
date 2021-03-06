'use strict'

const co = require('co')
const { send } = require('micro')
const p = require('path-to-regexp')
const createRouter = require('http-service-router')
const helmet = require('helmet')
const Bluebird = require('bluebird')

const noCacheAsync = Bluebird.promisify(helmet.noCache())

module.exports = createAPI

function createAPI ({
  services: {
    websiteAPI
  }
}) {
  const router = createRouter([
    [p('/websites', { end: false }), websiteAPI]
  ])

  return co.wrap(function * api (req, res) {
    const r = router.match(req.url)
    yield noCacheAsync(req, res)
    if (r) {
      req.url = r.url
      return yield r.service(req, res)
    }
    send(res, 200, { title: 'webdesignio API', version: '2' })
    return null
  })
}
