'use strict'

const kue = require('kue')
const config = require('config')

const queue = kue.createQueue({ redis: config.get('redis') })

module.exports = buildWebsite

function buildWebsite (req, res, next) {
  const job = queue.create('build_website', {
    title: 'build website ' + req.params.website,
    id: req.params.website
  })
  job.save()
  res.send(job)
}
