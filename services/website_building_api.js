'use strict'

const co = require('co')
const { createError } = require('micro')

module.exports = createWebsiteBuildingAPI

function createWebsiteBuildingAPI ({ queue }) {
  return co.wrap(function * websiteBuildingAPI (req, res) {
    if (req.method !== 'POST') throw createError(405)
    const job = queue.create('build_website', {
      title: 'build website ' + req.query.website,
      id: req.query.website
    })
    job.save()
    return job
  })
}
