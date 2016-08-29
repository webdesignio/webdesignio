'use strict'

const cookie = require('cookie')
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
        .then(({ user: _id }) => users.findOne({ _id }))
        .catch(e =>
          (e.name === 'TokenExpiredError' || e.name === 'JsonWebTokenError')
            ? Promise.resolve(null)
            : Promise.reject(e)
        ),
      websites.findOne({ _id: websiteID })
    ])
    .then(([user, website]) =>
      !website
        ? Promise.reject(createError(404))
        : (
          !user || !user.isActive
            ? Promise.reject(createError(401))
            : (
              (
                website.owner !== user._id &&
                website.users.indexOf(user._id) === -1
              )
              ? Promise.reject(createError(403))
              : app(req, res, next)
            )
        )
    )
    .catch(err => {
      if (err.statusCode === 403) {
        res.writeHead(302, { location: errorPages.forbidden })
        res.end('Redirecting ...')
      } else if (err.statusCode === 401) {
        res.writeHead(302, { location: '/login' })
        res.end('Redirecting to /login ...')
      } else if (err.statusCode === 404) {
        res.writeHead(302, { location: errorPages.notFound })
        res.end('Redirecting to /login ...')
      } else {
        sendError(req, res, err)
      }
    })
  }
}
