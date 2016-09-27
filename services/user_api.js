'use strict'

const co = require('co')
const { createError } = require('micro')

module.exports = createUserAPI

function createUserAPI ({ services: { userUpsertionAPI } }) {
  return co.wrap(function * userAPI (req, res) {
    if (req.method === 'POST') {
      return yield userUpsertionAPI(req, res)
    } else {
      throw createError(405)
    }
  })
}
