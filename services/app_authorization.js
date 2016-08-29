'use strict'

const cookie = require('cookie')
const error = require('http-errors')
const { verify } = require('jsonwebtoken')
const Bluebird = require('bluebird')
const { sendError, createError } = require('micro')

const verifyAsync = Bluebird.promisify(verify)

module.exports = appAuthorization

function appAuthorization ({ secret, errorPages, websites, users, app }) {
  return (req, res, next) => {
    const { token } = cookie.parse(req.headers.cookie || '')
    const websiteID = req.headers['x-website']
    if (req.url === '/login') return app(req, res, next)
    return Promise.all([
      verifyAsync(token, secret, null)
        .catch(e => { throw createError(401) })
        .then(({ user: _id }) => users.findOne({ _id })),
      websites.findOne({ _id: websiteID })
    ])
    .then(([user, website]) =>
      !user || !user.isActive
        ? Promise.reject(401)
        : (
          (
            website &&
            website.owner !== user._id &&
            website.users.indexOf(user._id) === -1
          )
          ? Promise.reject(error(403))
          : (!website ? Promise.reject(404) : app(req, res, next))
        )
    )
    .catch(err => {
      if (err.statusCode === 403) {
        res.writeHead(302, { location: errorPages.forbidden })
        res.end('Redirecting ...')
      } else if (err.statusCode === 401) {
        res.writeHead(302, { location: '/login' })
        res.end('Redirecting to /login ...')
      } else {
        sendError(req, res, err)
      }
    })
  }
}
