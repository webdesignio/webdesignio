'use strict'

const url = require('url')
const co = require('co')
const { sendError, createError } = require('micro')
const { validate } = require('jsonschema')

module.exports = createRecordQueryAPI

const querySchema = {
  type: 'object',
  properties: {
    type: { type: 'string', required: true, minLength: 1 },
    start: { type: 'any' },
    limit: { type: 'number', maximum: 100, minimum: 1 }
  },
  additionalProperties: false
}

function createRecordQueryAPI ({ objects }) {
  return co.wrap(function * recordQueryAPI (req, res) {
    const parsedURL = url.parse(req.url, true)
    const { website: websiteID } = parsedURL.query
    let query
    try {
      query = JSON.parse(parsedURL.query.query)
    } catch (e) {
      throw createError(400, 'Invalid JSON')
    }
    const { valid } = validate(query, querySchema)
    if (!valid) throw createError(400)
    const { type, start, limit = 40 } = query
    const queryObject = start
      ? { website: websiteID, type, _id: { $gt: start } }
      : { website: websiteID, type }
    const cursor = objects.find(queryObject).limit(limit).sort({ _id: 1 })
    let first = true
    let startSend = false
    cursor
      .on('error', e => sendError(req, res, e))
      .on('data', o => {
        if (!startSend) {
          res.setHeader('Transfer-Encoding', 'chunked')
          res.setHeader('Content-Type', 'application/json')
          res.write('[')
          startSend = true
        }
        res.write(
          (!first ? ',' : '') +
          (process.env.NODE_ENV === 'production'
            ? JSON.stringify(o)
            : JSON.stringify(o, null, 2))
        )
        first = false
      })
      .on('end', () => {
        if (!startSend) {
          res.setHeader('Transfer-Encoding', 'chunked')
          res.setHeader('Content-Type', 'application/json')
          res.write('[')
          startSend = true
        }
        res.end(']')
      })
    return null
  })
}
