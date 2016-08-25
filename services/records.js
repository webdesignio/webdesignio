'use strict'

const express = require('express')
const bunyan = require('bunyan')
const error = require('http-errors')
const { json } = require('body-parser')

const service = module.exports = express.Router()

const fleet = Object.assign(
  { log: bunyan.createLogger({ name: 'meta' }) },
  require('./plugins/pages'),
  require('./plugins/objects')
)

service.use(json())

service.get('/:type/:id', (req, res, next) => {
  const { website } = req.query
  const { type, id } = req.params
  if (['pages', 'objects'].indexOf(type) === -1) return next()
  const promise = type === 'pages'
    ? fleet.getPage({ name: id, website })
    : fleet.getObject({ id, website })
  promise
    .then(record =>
      record
        ? Promise.resolve(record)
        : Promise.reject(error(404, 'Record not found'))
    )
    .then(record => res.send(record))
    .catch(next)
})

service.put('/:type/:id', (req, res, next) => {
  const { website } = req.query
  const { type, id } = req.params
  if (['pages', 'objects'].indexOf(type) === -1) return next()
  const promise = type === 'pages'
    ? fleet.updatePage({
      data: Object.assign({}, req.body, { website, name: id })
    })
    : fleet.upsertObject({
      data: Object.assign({}, req.body, { website, _id: id })
    })
  promise
    .then(record =>
      record
        ? Promise.resolve(record)
        : Promise.reject(error(404, 'Record not found'))
    )
    .then(record => res.send(record))
    .catch(next)
})
