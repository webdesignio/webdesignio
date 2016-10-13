'use strict'

const util = require('util')
const url = require('url')
const co = require('co')
const { send, json, createError } = require('micro')
const { validate } = require('jsonschema')

const debuglog = util.debuglog('website_api')

module.exports = createWebsiteUpsertionAPI

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
  },
  additionalProperties: false
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

function createWebsiteUpsertionAPI ({ collections: { websites, users } }) {
  return co.wrap(function * websiteUpsertionAPI (req, res) {
    const { query } = url.parse(req.url, true)
    const { website: websiteID } = query
    const maybeWebsite = yield websites.findOne({ _id: websiteID })
    const body = yield json(req)
    const isNew = !maybeWebsite
    const website =
      Object.assign(
        !maybeWebsite
          ? defaults(body)
          : Object.assign({}, maybeWebsite, body),
        { _id: websiteID }
      )
    website.owner =
      maybeWebsite
        ? (req.headers['x-user'] === maybeWebsite.owner
          ? website.owner
          : maybeWebsite.owner
        )
        : req.headers['x-user']
    if (!validate(website, schema).valid) throw createError(400, 'Invalid json body')
    const maxNumberOfUsers = Number(req.headers['x-plan-max-number-of-users'])
    if (website.users.length > maxNumberOfUsers) {
      throw createError(
        403,
        `You need to upgrade your plan to have ${website.users.length} users`
      )
    }
    if (isNew) {
      const maxNumberOfWebsites = Number(req.headers['x-plan-max-number-of-websites'])
      const currentNumberOfWebsites = Number(req.headers['x-user-number-of-websites'])
      if (currentNumberOfWebsites >= maxNumberOfWebsites) {
        throw createError(403, 'You need to upgrade your plan to create more websites')
      }
      debuglog('increase user website limit')
      const { result } = yield users.update(
        currentNumberOfWebsites === 0
          ? {
            _id: req.headers['x-user'],
            $or: [{ numberOfWebsites: 0 }, { numberOfWebsites: null }]
          }
          : { _id: req.headers['x-user'], numberOfWebsites: currentNumberOfWebsites },
        { $inc: { numberOfWebsites: 1 } }
      )
      if (result.nModified !== 1) {
        throw createError(403, 'You need to upgrade your plan to create more websites')
      }
      debuglog('insert website', website)
      yield websites.insertOne(website)
    } else {
      debuglog('update website', util.inspect(website, { colors: true, depth: null }))
      yield websites.updateOne({ _id: websiteID }, { $set: website })
    }
    send(res, isNew ? 201 : 200, website)
  })
}
