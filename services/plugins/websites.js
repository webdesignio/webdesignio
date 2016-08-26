'use strict'

const mongoose = require('mongoose')

const Website = mongoose.model('websites', new mongoose.Schema({
  _id: { type: String, required: true, unique: true },
  owner: { type: String, required: true },
  users: [String],
  defaultLanguage: { type: String, required: true },
  languages: { type: [String] },
  noLangFields: { type: [String] },
  fieldKeys: { type: [String] },
  fields: { type: {}, default: {} },
  config: { type: {}, required: true }
}, { minimize: false }))

module.exports = {
  getWebsite ({ id }) {
    return Website.findById(id)
  }
}
