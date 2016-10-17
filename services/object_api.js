'use strict'

const co = require('co')
const { createError } = require('micro')
const createRouter = require('http-service-router')
const p = require('path-to-regexp')

module.exports = createObjectAPI

function createObjectAPI ({ services: { objectQueryAPI } }) {
  const router = createRouter([
    [p('/:object?'), null]
  ])
  return co.wrap(function * objectAPI (req, res) {
    const r = router.match(req.url)
    console.log(req.url)
    if (r) {
      req.url = r.url
      req.headers['x-object'] = r.match[1]
      if (r.service) return yield r.service(req, res)
      switch (req.method) {
        case 'GET':
          return yield objectQueryAPI(req, res)
        default:
          throw createError(405)
      }
    } else {
      throw createError(404, 'Object resource not found')
    }
  })
}
