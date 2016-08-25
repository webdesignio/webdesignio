'use strict'

const express = require('express')
const bunyan = require('bunyan')
const error = require('http-errors')
const { json } = require('body-parser')

const service = module.exports = express.Router()

const fleet = Object.assign(
  { log: bunyan.createLogger({ name: 'meta' }) },
  require('./plugins/websites')
)

service.use(json())

service.get('/:website', (req, res, next) => {
  const { website } = req.params
  fleet.getWebsite({ id: website })
    .then(website =>
      website
        ? Promise.resolve(website)
        : Promise.reject(error(404))
    )
    .then(website => res.send(mask(website)))
    .catch(next)
})

service.put('/:website', (req, res, next) => {
  const { website } = req.params
  fleet.updateWebsite({
    data: Object.assign({}, req.body, { _id: website })
  })
  .then(website => res.send(mask(website)))
  .catch(next)
})

function mask (website) {
  const o = website.toObject()
  delete o.config
  return o
}
