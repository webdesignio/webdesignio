'use strict'

const { json, createError, send } = require('micro')
const Bluebird = require('bluebird')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const co = require('co')

const compareAsync = Bluebird.promisify(bcrypt.compare)
const signAsync = Bluebird.promisify(jwt.sign)

module.exports = createTokenAPI

function createTokenAPI ({ users, secret }) {
  return co.wrap(function * tokenAPI (req, res) {
    if (req.method !== 'POST') throw createError(405)
    const { email, password } = yield json(req)
    const user = yield users.findOne({ email })
    if (!user) throw createError(404, 'Unknown user')
    const valid = yield compareAsync(password, user.hash)
    if (!valid) throw createError(401, 'Invalid email and/or password')
    const payload = { user: user._id, tokenSecret: user.tokenSecret }
    const token = yield signAsync(payload, secret, null)
    send(res, 201, { token })
  })
}
