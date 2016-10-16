'use strict'

const { Transform } = require('stream')
const co = require('co')
const { createError, sendError } = require('micro')

module.exports = createPageQueryAPI

function createPageQueryAPI ({ collections: { websites, pages } }) {
  return co.wrap(function * pageQueryAPI (req, res) {
    const website = yield websites.findOne({
      _id: req.headers['x-website'],
      $or: [
        { owner: req.headers['x-user'] },
        { users: req.headers['x-user'] },
        { collaborators: req.headers['x-user'] }
      ]
    })
    if (!website) throw createError(404, 'Website not found')
    if (req.headers['x-page']) {
      const page =
        yield pages.findOne({
          website: website._id,
          name: req.headers['x-page']
        })
      if (!page) {
        return { name: req.headers['x-page'], website: website._id, fields: {} }
      }
      return page
    } else {
      const cursor = pages.find({ website: website._id }).sort({ name: 1 })
      cursor.on('error', e => sendError(req, res, e))
      res.setHeader('Transfer-Encoding', 'chunked')
      res.setHeader('Content-Type', 'application/json')
      cursor.pipe(createObjectWriter()).pipe(res)
      return null
    }
  })
}

function createObjectWriter () {
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
