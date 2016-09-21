'use strict'

const util = require('util')
const co = require('co')
const Bluebird = require('bluebird')
const { verify } = require('jsonwebtoken')
const { createError } = require('micro')

const debuglog = util.debuglog('authorization')
const verifyAsync = Bluebird.promisify(verify)

module.exports = createAuthorization

function createAuthorization ({
  secret,
  errorPages,
  collections: { users, websites },
  services: { upstream }
}) {
  return co.wrap(function * authorization (req, res) {
    if (req.url === '/login' || req.url === '/api/v1/tokens') {
      return yield upstream(req, res)
    }
    const redirect = !req.url.match(/^\/api\//)
    const websiteID = req.headers['x-website']
    const token = req.headers['x-jsonwebtoken']
    const [user, website] = yield Promise.all([
      verifyAsync(token, secret, null)
        .then(({ user: _id }) => users.findOne({ _id }))
        .catch(e =>
          e.name === 'TokenExpiredError' || e.name === 'JsonWebTokenError'
            ? Promise.resolve(null)
            : Promise.reject(e)
        ),
      websites.findOne({ _id: websiteID })
    ])
    if (!user) return unauthorized(redirect, res)
    req.headers['x-user'] = user._id
    if (!website) {
      debuglog('proxy to upstream (with new website)')
      return yield upstream(req, res)
    }
    if (
      website.owner !== user._id &&
      website.users.indexOf(user._id) === -1
    ) return forbidden(redirect, res)
    debuglog('proxy to upstream')
    return yield upstream(req, res)
  })

  function forbidden (redirect, res) {
    debuglog('send forbidden')
    if (redirect) {
      res.writeHead(302, { location: errorPages.forbidden })
      res.end('Redirecting ...')
    } else {
      throw createError(403)
    }
    return null
  }

  function unauthorized (redirect, res) {
    debuglog('send unauthorized')
    if (redirect) {
      res.writeHead(302, { location: '/login' })
      res.end('Redirecting ...')
    } else {
      throw createError(401)
    }
    return null
  }
}
