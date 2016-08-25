'use strict'

const mongoose = require('mongoose')

const Website = mongoose.model('websites', {
  _id: { type: String, required: true, unique: true },
  defaultLanguage: { type: String, required: true },
  languages: { type: [String] },
  noLangFields: { type: [String] },
  fieldKeys: { type: [String] },
  fields: { type: {}, required: true },
  config: { type: {}, required: true }
})

module.exports = {
  getWebsite ({ id }) {
    return Website.findById(id)
  },

  updateWebsite ({ data }) {
    return Website.findById(data._id)
      .then(website =>
        website == null
          ? new Website(data)
          : Object.assign(website, data)
      )
      .then(website => website.save())
  }
}
