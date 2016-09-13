'use strict'

const url = require('url')
const co = require('co')
const { createError } = require('micro')

module.exports = createWebsiteBuildingAPI

function createWebsiteBuildingAPI ({ queue }) {
  return co.wrap(function * websiteBuildingAPI (req, res) {
    if (req.method !== 'POST') throw createError(405)
    const { query } = url.parse(req.url, true)
    const job = queue.create('build_website', {
      title: 'build website ' + query.website,
      id: query.website
    })
    job.save()
    return job
  })
}
