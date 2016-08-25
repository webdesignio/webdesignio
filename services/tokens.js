'use strict'

const express = require('express')
const { json } = require('body-parser')
const bunyan = require('bunyan')
const Bluebird = require('bluebird')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const error = require('http-errors')
const config = require('config')

const compareAsync = Bluebird.promisify(bcrypt.compare)
const signAsync = Bluebird.promisify(jwt.sign)
const fleet = Object.assign(
  { log: bunyan.createLogger({ name: 'tokens' }) },
  require('./plugins/users')
)

const tokens = module.exports = express.Router()

tokens.post('/', json(), (req, res, next) => {
  const { email, password } = req.body
  fleet.getUser({ email })
    .then(user =>
      !user
        ? Promise.reject(error(401, 'Invalid email and/or password'))
        : compareAsync(password, user.hash)
          .then(valid =>
            !valid
              ? Promise.reject(error(401, 'Invalid email and/or password'))
              : signAsync(
                { user: user._id, tokenSecret: user.tokenSecret },
                config.get('secret'),
                {}
              )
          )
    )
    .then(token => {
      res.status(201).send({ token })
    })
    .catch(next)
})
