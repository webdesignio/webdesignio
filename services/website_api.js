'use strict'

const url = require('url')
const error = require('http-errors')
const { json, sendError, createError } = require('micro')
const { validate } = require('jsonschema')
const { send } = require('micro')

module.exports = handler

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

function handler ({ collection }) {
  return (req, res) => {
    const { query } = url.parse(req.url, true)
    const { website: websiteID } = query
    if (req.method === 'GET') {
      collection.findOne({ _id: websiteID })
        .then(website =>
          website
            ? Promise.resolve(website)
            : Promise.reject(error(404))
        )
        .then(website => send(res, 200, mask(website)))
        .catch(e => sendError(req, res, e))
    } else if (req.method === 'PUT') {
      collection.findOne({ _id: websiteID })
        .then(website =>
          json(req).then(body => ({ website, body }))
        )
        .then(({ website, body }) =>
          !website
            ? {
              isNew: true,
              website: defaults(Object.assign(
                { _id: websiteID },
                body,
                { owner: req.headers['x-user'] }
              ))
            }
            : { isNew: false, website: Object.assign({}, website, body) }
        )
        .then(({ isNew, website }) =>
          validate(website, schema).valid
            ? { isNew, website }
            : Promise.reject(createError(400, 'Invalid json body'))
        )
        .then(({ isNew, website }) =>
          (
            isNew
              ? collection.insertOne(website)
              : collection.updateOne({ _id: website._id }, { $set: website })
          )
          .then(() => ({ isNew, website }))
        )
        .then(({ isNew, website }) => send(res, isNew ? 201 : 200, website))
        .catch(e => sendError(req, res, e))
    } else {
      sendError(req, res, createError(405))
    }
  }
}

function mask (website) {
  const o = Object.assign({}, website)
  delete o.config
  return o
}
