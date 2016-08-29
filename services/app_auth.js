'use strict'

const jwt = require('express-jwt')
const express = require('express')
const config = require('config')
const bunyan = require('bunyan')
const cookie = require('cookie')
const error = require('http-errors')

const auth = module.exports = express()

const fleet = Object.assign(
  { log: bunyan.createLogger({ name: 'auth' }) },
  require('./plugins/users')
)

auth
  .use(
    jwt({
      secret: config.get('secret'),
      requestProperty: 'auth',
      getToken (req) {
        return cookie.parse(req.headers.cookie || '').token
      }
    })
    .unless({ useOriginalUrl: false, path: ['/login'] })
  )
  .use((req, res, next) => {
    if (!req.auth) return next()
    fleet.getUser({ id: req.auth.user })
      .then(user => {
        if (!user || !user.isActive) throw error(401)
        req.headers['x-user'] = req.auth.user
        next()
      })
      .catch(next)
  })
  .use((err, req, res, next) => {
    if (err.name === 'UnauthorizedError') {
      res.redirect('/login')
      return
    }
    next(err)
  })
