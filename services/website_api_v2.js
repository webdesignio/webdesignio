'use strict'

const co = require('co')
const { createError } = require('micro')
const p = require('path-to-regexp')
const createRouter = require('../lib/router')

module.exports = createWebsiteAPI

function createWebsiteAPI ({ services: { websiteQueryAPI, serviceAPI, pageAPI } }) {
  const router = createRouter([
    [p('/:website/services', { end: false }), serviceAPI],
    [p('/:website/pages', { end: false }), pageAPI],
    [p('/:website'), null]
  ])

  return co.wrap(function * websiteAPI (req, res) {
    const r = router.match(req.url)
    if (r) {
      req.url = r.url
      req.headers['x-website'] = r.match[1]
      if (r.service) return yield r.service(req, res)
      switch (req.method) {
        case 'GET':
          return yield websiteQueryAPI(req, res)
        default:
          throw createError(405)
      }
    }
    throw createError(404, 'Website resource not found')
  })
}
