'use strict'

const url = require('url')
const { createError } = require('micro')
const co = require('co')

module.exports = createMetaAPI

function createMetaAPI ({ getGfs }) {
  return co.wrap(function * metaAPI (req, res) {
    const { website: websiteID } = url.parse(req.url, true).query
    const match = req.url.match(/^\/api\/v1\/meta\/([^/?]+)/)
    if (!match) throw createError(400)
    const filename = decodeURIComponent(match[1])
    const gfs = getGfs()
    const file = yield gfs.files.findOne({ 'metadata.website': websiteID, filename })
    if (!file) throw createError(404)
    return Object.assign({}, { noLangFields: [] }, file.metadata)
  })
}
