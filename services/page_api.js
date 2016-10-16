'use strict'

const p = require('path-to-regexp')
const co = require('co')
const { createError } = require('micro')

const createRouter = require('../lib/router')

module.exports = createPageAPI

function createPageAPI ({ services: { pageQueryAPI } }) {
  const router = createRouter([
    [p('/:page?'), null]
  ])
  return co.wrap(function * pageAPI (req, res) {
    const r = router.match(req.url)
    if (r) {
      req.url = r.url
      req.headers['x-page'] = r.match[1]
      if (r.service) return yield r.service(req, res)
      switch (req.method) {
        case 'GET':
          return yield pageQueryAPI(req, res)
        default:
          throw createError(405)
      }
    } else {
      throw createError(404, 'Page resource not found')
    }
  })
}
