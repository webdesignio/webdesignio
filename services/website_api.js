'use strict'

const url = require('url')
const co = require('co')
const { createError } = require('micro')

module.exports = createWebsiteAPI

function createWebsiteAPI ({ collections: { websites }, services: { websiteUpsertionAPI } }) {
  return co.wrap(function * websiteAPI (req, res) {
    const { query } = url.parse(req.url, true)
    const { website: websiteID } = query
    if (req.method === 'GET') {
      const website = yield websites.findOne({ _id: websiteID })
      if (!website) throw createError(404)
      return mask(website)
    } else if (req.method === 'PUT') {
      return yield websiteUpsertionAPI(req, res)
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
