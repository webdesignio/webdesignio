'use strict'

const mongoose = require('mongoose')
const shortid = require('shortid')
const bcrypt = require('bcrypt')
const Bluebird = require('bluebird')
const { Schema } = mongoose

const genSaltAsync = Bluebird.promisify(bcrypt.genSalt)
const hashAsync = Bluebird.promisify(bcrypt.hash)

const schema = new Schema({
  _id: { type: String, unique: true, required: true, default: shortid },
  email: { type: String, unique: true, required: true },
  isActive: { type: Boolean, required: true, default: true },
  hash: { type: String, required: true },
  tokenSecret: { type: String, default: shortid }
})

const User = mongoose.model('users', schema)

module.exports = {
  getUser ({ id, email }) {
    const query = Object.assign(
      {},
      id ? { _id: id } : null,
      email ? { email } : null,
      (!id && !email) ? { id, email } : null
    )
    return User.findOne(query)
      .then(u => u ? u.toObject() : u)
  },

  getUserByEmail ({ email }) {
    return User.findOne({ email }).then(u => u && u.toObject())
  },

  createUser ({ email, password, isActive = true }) {
    return genSaltAsync(10)
      .then(salt => hashAsync(password, salt))
      .then(hash => new User({ email, isActive, hash }).save())
      .then(user => user.toObject())
  }
}
