'use strict'

const co = require('co')
const { createError } = require('micro')
const p = require('path-to-regexp')
const createRouter = require('http-service-router')

module.exports = createApp

function createApp ({ services: { api, apiV2, login, editable } }) {
  const router = createRouter([
    [p('/api/v1', { end: false }), api],
    [p('/api/v2', { end: false }), apiV2],
    [p('/login'), login],
    [p('/', { end: false }), editable]
  ])

  return co.wrap(function * app (req, res) {
    const r = router.match(req.url)
    if (r) {
      req.url = r.url
      return yield r.service(req, res)
    }
    throw createError(404, 'Resource not found')
  })
}
