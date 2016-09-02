'use strict'

const url = require('url')
const { json, sendError, send, createError } = require('micro')
const { validate } = require('jsonschema')

module.exports = recordAPI

const pageSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    website: { type: 'string', minLength: 1 },
    fields: { type: 'object', required: true }
  }
}

const objectSchema = {
  type: 'object',
  properties: {
    _id: { type: 'string', minLength: 1 },
    type: { type: 'string', minLength: 1 },
    website: { type: 'string', minLength: 1 },
    fields: { type: 'object', required: true }
  }
}

function defaults (record) {
  return Object.assign({ fields: {} }, record)
}

function recordAPI ({ objects, pages }) {
  return (req, res) =>
    handler(req, res)
      .catch(e => sendError(req, res, e))

  async function handler (req, res) {
    const { website } = url.parse(req.url, true).query
    const match = req.url.match(/^\/(pages|objects)\/([^/?]+)/)
    const type = match[1]
    const id = match[2]
    const collection = type === 'pages' ? pages : objects
    const query =
      type === 'pages'
        ? { name: id, website }
        : { _id: id, website }
    if (req.method === 'GET') {
      const record = await collection.findOne(query)
      if (!record) {
        if (type === 'objects') throw createError(404)
        send(res, 200, defaults(query))
      } else {
        send(res, 200, record)
      }
    } else if (req.method === 'PUT') {
      const body = await json(req)
      const schema = type === 'pages' ? pageSchema : objectSchema
      const update = defaults(Object.assign({}, body, query))
      if (!validate(update, schema).valid) throw createError(400)
      delete update._id
      const { result } = await collection.update(query, update, { upsert: true })
      const { nModified } = result
      const record = await collection.findOne(query)
      send(res, !nModified ? 201 : 200, record)
    } else {
      throw createError(405)
    }
    return null
  }
}
