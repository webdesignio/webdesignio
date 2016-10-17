'use strict'

const co = require('co')
const helmet = require('helmet')
const Bluebird = require('bluebird')

const helmetAsync = Bluebird.promisify(helmet({
  hsts: {
    force: true,
    maxAge: 7776000000,
    includeSubDomains: true
  }
}))

module.exports = createProtector

function createProtector ({ services: { upstream } }) {
  return co.wrap(function * protector (req, res) {
    // Skip during development
    if (process.env.NODE_ENV !== 'production') return yield upstream(req, res)
    yield helmetAsync(req, res)
    return yield upstream(req, res)
  })
}
