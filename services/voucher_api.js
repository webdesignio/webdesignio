'use strict'

const co = require('co')
const { createError } = require('micro')
const { sign } = require('jsonwebtoken')

module.exports = voucherAPI

function voucherAPI ({ collections: { websites, services } }) {
  return co.wrap(function * voucherAPI (req, res) {
    if (req.method === 'GET') {
      const [website, service] = yield Promise.all([
        websites.findOne({
          _id: req.headers['x-website'],
          services: req.headers['x-service'],
          $or: [
            { owner: req.headers['x-user'] },
            { users: req.headers['x-user'] },
            { collaborators: req.headers['x-user'] }
          ]
        }),
        services.findOne({ _id: req.headers['x-service'] })
      ])
      if (!website) throw createError(404, 'Website or service connection not found')
      if (!service) throw createError(404, 'Service not found')
      const voucher = {
        website: website._id,
        role: website.owner === req.headers['x-user']
          ? 'owner'
          : (websites.users.includes(req.headers['x-user'])
            ? 'user'
            : 'collaborator')
      }
      return sign(voucher, service.secret, { expiresIn: '5m' })
    } else {
      throw createError(405)
    }
  })
}
