'use strict'

const jwt = require('express-jwt')
const express = require('express')
const config = require('config')
const error = require('http-errors')

const { handleJSONError } = require('../lib/error_handlers')

const auth = module.exports = express()

const fleet = Object.assign(
  {},
  require('./plugins/users')
)

auth
  .use(
    jwt({
      secret: config.get('secret'),
      requestProperty: 'auth',
      getToken (req) {
        if (
          req.headers.authorization &&
          req.headers.authorization.split(' ')[0] === 'Bearer'
        ) {
          return req.headers.authorization.split(' ')[1]
        } else if (req.query && req.query.token) {
          return req.query.token
        }
      }
    })
    .unless({ useOriginalUrl: false, path: ['/tokens'] })
  )
  .use((req, res, next) => {
    if (!req.auth) return next()
    fleet.getUser({ id: req.auth.user })
      .then(user => {
        if (!user || !user.isActive) throw error(401, 'User is disabled')
        req.headers['x-user'] = req.auth.user
        next()
      })
      .catch(next)
  })
  .use(handleJSONError)
