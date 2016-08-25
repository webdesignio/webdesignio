'use strict'

const mongoose = require('mongoose')
const { Schema } = mongoose

const _Object = mongoose.model('objects', new Schema({
  _id: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  website: { type: String, required: true },
  fields: { type: {}, required: true }
}, { minimize: false }))

module.exports = {
  getObject ({ id, website }) {
    return _Object.findOne({ _id: id, website })
  },

  upsertObject ({ data }) {
    return _Object.findOne({ _id: data._id, website: data.website })
      .then(object =>
        object == null
          ? new _Object(data)
          : Object.assign(object, data)
      )
      .then(object => object.save())
  },

  getObjects ({ website, $select }) {
    const cursor = _Object.find({ website })
    return $select ? cursor.select($select) : cursor
  }
}
