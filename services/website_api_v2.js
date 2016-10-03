'use strict'

const co = require('co')
const { createError } = require('micro')
const p = require('path-to-regexp')
const createRouter = require('../lib/router')

module.exports = createWebsiteAPI

function createWebsiteAPI ({ services: { serviceAPI } }) {
  const router = createRouter([
    [p('/:website/services', { end: false }), serviceAPI]
  ])

  return co.wrap(function * websiteAPI (req, res) {
    const r = router.match(req.url)
    if (r) {
      req.url = r.url
      req.headers['x-website'] = r.match[1]
      return yield r.service(req, res)
    }
    throw createError(404, 'Website resource not found')
  })
}
