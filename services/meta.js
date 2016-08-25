'use strict'

const express = require('express')
const bunyan = require('bunyan')
const error = require('http-errors')

const service = module.exports = express.Router()

const fleet = Object.assign(
  { log: bunyan.createLogger({ name: 'meta' }) },
  require('./plugins/files')
)

service.get('/:filename', (req, res, next) => {
  const website = req.query.website
  fleet.getFile({
    'metadata.website': website,
    filename: req.params.filename
  })
  .then(file => file ? Promise.resolve(file) : Promise.reject(error(404)))
  .then(file =>
    res.send(Object.assign({}, { noLangFields: [] }, file.metadata))
  )
  .catch(next)
})
