'use strict'

const mongoose = require('mongoose')
const shortid = require('shortid')
const { Schema } = mongoose

const Page = mongoose.model('pages', new Schema({
  _id: { type: String, required: true, unique: true, default: shortid },
  name: { type: String, required: true },
  website: { type: String, required: true },
  fields: { type: {}, required: true }
}, { minimize: false }))

module.exports = {
  getPage ({ id, name, website }) {
    const query = Object.assign(
      { website },
      id ? { _id: id } : null,
      name ? { name } : null
    )
    return Page.findOne(query)
      .then(page =>
        page || (
          name
            ? new Page(Object.assign({}, query, { fields: {} }))
            : page
        )
      )
  },

  getPages ({ website, $select }) {
    const cursor = Page.find({ website })
    return $select ? cursor.select($select) : cursor
  },

  updatePage ({ data }) {
    return this.getPage({ name: data.name, website: data.website })
      .then(page =>
        Object.assign(page, { fields: data.fields })
      )
      .then(page => page.save())
  }
}
