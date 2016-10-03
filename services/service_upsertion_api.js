'use strict'

const co = require('co')
const { json, createError } = require('micro')
const { validate } = require('jsonwebtoken')

module.exports = createServiceUpsertionAPI

const serviceSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string', minLength: 1, required: true },
    title: { type: 'string', minLength: 1, required: true }
  }
}

function createServiceUpsertionAPI ({ collections: { services } }) {
  return co.wrap(function * serviceUpsertionAPI (req, res) {
    if (req.method === 'POST') {
      const body = yield json(req)
      const service = body
      if (!validate(service, serviceSchema).valid) throw createError(400)
    }
  })
}
