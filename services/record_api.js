'use strict'

const url = require('url')
const { json, send, createError } = require('micro')
const { validate } = require('jsonschema')
const co = require('co')

const createObjectQueryAPI = require('./object_query_api')

module.exports = recordAPI

const pageSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1, required: true },
    website: { type: 'string', minLength: 1, required: true },
    fields: { type: 'object', required: true }
  },
  additionalProperties: false
}

const objectSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string', minLength: 1, required: true },
    type: { type: 'string', minLength: 1, required: true },
    website: { type: 'string', minLength: 1, required: true },
    fields: { type: 'object', required: true }
  },
  additionalProperties: false
}

function defaults (record) {
  return Object.assign({ fields: {} }, record)
}

function recordAPI ({ objects, pages }) {
  const objectQueryAPI = createObjectQueryAPI({ objects, pages })

  return co.wrap(function * handler (req, res) {
    const { website } = url.parse(req.url, true).query
    const match = req.url.match(/^\/(pages|objects)\/([^/?]+)/)
    if (!match) {
      if (req.method === 'GET') return objectQueryAPI(req, res)
      throw createError(405)
    }
    const type = match[1]
    const id = match[2]
    const collection = type === 'pages' ? pages : objects
    const query =
      type === 'pages'
        ? { name: id, website }
        : { _id: id, website }
    if (req.method === 'GET') {
      const record = yield collection.findOne(query)
      if (!record) {
        if (type === 'objects') throw createError(404)
        send(res, 200, defaults(query))
      } else {
        send(res, 200, record)
      }
    } else if (req.method === 'PUT') {
      const body = yield json(req)
      const schema = type === 'pages' ? pageSchema : objectSchema
      const update = defaults(Object.assign({}, body, query))
      if (!validate(update, schema).valid) throw createError(400)
      delete update._id
      const { result } = yield collection.update(query, update, { upsert: true })
      const { nModified } = result
      const record = yield collection.findOne(query)
      send(res, !nModified ? 201 : 200, record)
    } else {
      throw createError(405)
    }
  })
}
