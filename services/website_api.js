'use strict'

const url = require('url')
const { json, createError } = require('micro')
const { validate } = require('jsonschema')
const { send } = require('micro')
const co = require('co')

module.exports = createWebsiteAPI

const schema = {
  type: 'object',
  properties: {
    _id: { type: 'string', minLength: 1 },
    owner: { type: 'string', minLength: 1 },
    users: { type: 'array', items: { type: 'string' } },
    defaultLanguage: { type: 'string', minLength: 1 },
    languages: { type: 'array', items: { type: 'string' }, minLength: 1 },
    noLangFields: { type: 'array', items: { type: 'string' } },
    fieldKeys: { type: 'array', items: { type: 'string' } },
    fields: { type: 'object', required: true },
    config: { type: 'object', required: true }
  }
}

function defaults (model) {
  return Object.assign({
    users: [],
    noLangFields: [],
    fieldKeys: [],
    fields: {},
    config: {}
  }, model)
}

function createWebsiteAPI ({ websites }) {
  return co.wrap(function * websiteAPI (req, res) {
    const { query } = url.parse(req.url, true)
    const { website: websiteID } = query
    if (req.method === 'GET') {
      const website = yield websites.findOne({ _id: websiteID })
      if (!website) throw createError(404)
      return mask(website)
    } else if (req.method === 'PUT') {
      const maybeWebsite = yield websites.findOne({ _id: websiteID })
      const body = yield json(req)
      const isNew = !maybeWebsite
      const website =
        !maybeWebsite
          ? defaults(Object.assign(
            { _id: websiteID },
            body,
            { owner: req.headers['x-user'] }
          ))
          : Object.assign({}, maybeWebsite, body)
      if (!validate(website, schema).valid) throw createError(400, 'Invalid json body')
      if (isNew) {
        yield websites.insertOne(website)
      } else {
        yield websites.updateOne({ _id: website._id }, { $set: website })
      }
      send(res, isNew ? 201 : 200, website)
    } else {
      throw createError(405)
    }
  })
}

function mask (website) {
  const o = Object.assign({}, website)
  delete o.config
  return o
}
