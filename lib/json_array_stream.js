'use strict'

const { Transform } = require('stream')

module.exports = createJSONArrayStream

function createJSONArrayStream () {
  let first = true
  return new Transform({
    objectMode: true,
    transform (o, encoding, callback) {
      const data = (!first ? ',' : '[') + JSON.stringify(o)
      first = false
      callback(null, data)
    },
    flush (callback) {
      this.push(first ? '[]' : ']')
      callback(null)
    }
  })
}
