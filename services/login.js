'use strict'

const express = require('express')
const mongoose = require('mongoose')
const Grid = require('gridfs-stream')
const error = require('http-errors')
const bunyan = require('bunyan')
const { urlencoded } = require('body-parser')

const fleet = Object.assign(
  { log: bunyan.createLogger({ name: 'login' }) },
  require('./plugins/files')
)

const login = module.exports = express.Router()

login.get('/', (req, res, next) => {
  const gfs = Grid(mongoose.connection.db, mongoose.mongo)
  fleet.getFile({
    filename: 'pages/login',
    'metadata.website': req.headers['x-website']
  })
  .then(file => file || Promise.reject(error(404)))
  .then(({ _id }) => {
    const readStream = gfs.createReadStream({ _id })
    res.writeHeader(200, { 'Content-Type': 'text/html' })
    readStream
      .on('error', next)
      .pipe(res)
  })
  .catch(next)
})

login.post('/', urlencoded({ extended: false }), (req, res) => {
  const { token } = req.body
  res.cookie('token', token, { path: '/' })
  res.redirect('/')
})
