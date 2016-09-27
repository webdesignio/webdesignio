'use strict'

const { createError, json, send } = require('micro')
const co = require('co')
const { genSalt, hash } = require('bcrypt')
const Bluebird = require('bluebird')
const { validate } = require('jsonschema')

const genSaltAsync = Bluebird.promisify(genSalt)
const hashAsync = Bluebird.promisify(hash)

module.exports = createUserUpsertionAPI

const userSchema = {
  type: 'object',
  properties: {
    email: { type: 'string', required: true, pattern: /^.+@.+$/ },
    password: { type: 'string', required: true }
  }
}

function createUserUpsertionAPI ({ collections: { users } }) {
  return co.wrap(function * userUpsertionAPI (req, res) {
    if (req.method === 'POST') {
      const body = yield json(req)
      if (!validate(body, userSchema).valid) throw createError(400)
      const { email, password } = body
      const isActive = true
      const salt = yield genSaltAsync(10)
      const hash = yield hashAsync(password, salt)
      try {
        yield users.insert({ email, isActive, hash })
      } catch (e) {
        if (e.name === 'MongoError' && e.code === 11000) {
          throw createError(409, 'User already exists')
        }
        throw e
      }
      send(res, 201, { email, isActive })
      return null
    } else {
      throw createError(405)
    }
  })
}
