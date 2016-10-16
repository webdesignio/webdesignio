'use strict'

const url = require('url')
const co = require('co')
const { sendError, createError } = require('micro')
const { validate } = require('jsonschema')
const createJSONArrayStream = require('../lib/json_array_stream')

module.exports = createObjectQueryAPI

const querySchema = {
  type: 'object',
  properties: {
    type: { type: 'string', minLength: 1 },
    gt: { type: 'string' },
    gte: { type: 'string' },
    limit: { type: 'number', minimum: 1 }
  },
  additionalProperties: false
}

function createObjectQueryAPI ({ collections: { websites, objects } }) {
  return co.wrap(function * objectQueryAPI (req, res) {
    const parsedURL = url.parse(req.url, true)
    let query
    try {
      query = JSON.parse(parsedURL.query.query || '{}')
    } catch (e) { throw createError(400, 'Invalid JSON') }
    if (!validate(query, querySchema).valid) throw createError(400)
    const website =
      yield websites.findOne({
        _id: req.headers['x-website'],
        $or: [
          { owner: req.headers['x-user'] },
          { collaborators: req.headers['x-user'] },
          { users: req.headers['x-user'] }
        ]
      })
    if (!website) throw createError(404, 'Website not found')
    if (req.headers['x-object']) {
      const o =
        yield objects.findOne({
          website: website._id,
          _id: req.headers['x-object']
        })
      if (!o) throw createError(404)
      return o
    } else {
      const cursor = execMongoQuery(objects, website, query)
      cursor.on('error', e => sendError(req, res, e))
      res.setHeader('Transfer-Encoding', 'chunked')
      res.setHeader('Content-Type', 'application/json')
      cursor.pipe(createJSONArrayStream()).pipe(res)
      return null
    }
  })
}

function execMongoQuery (objects, website, { type, gt, gte, limit = 40 }) {
  const query = Object.assign(
    { website: website._id },
    type ? { type } : {},
    gt ? { _id: { $gt: gt } } : {},
    gte ? { _id: { $gte: gte } } : {}
  )
  return objects.find(query).limit(limit).sort({ _id: 1 })
}
