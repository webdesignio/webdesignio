'use strict'

const co = require('co')
const p = require('path-to-regexp')
const { createError } = require('micro')
const createRouter = require('../lib/router')

module.exports = createServiceAPI

function createServiceAPI ({
  collections: { services },
  services: { voucherAPI }
}) {
  const router = createRouter([
    [p('/:service/vouchers', { end: false }), voucherAPI]
  ])

  return co.wrap(function * serviceAPI (req, res) {
    const r = router.match(req.url)
    if (r) {
      if (r.match[1]) req.headers['x-service'] = r.match[1]
      req.url = r.url
      return yield r.service(req, res)
    }
    throw createError(404, 'Service resource not found')
  })
}
