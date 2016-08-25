'use strict'

const bunyan = require('bunyan')
const error = require('http-errors')
const config = require('config')

const fleet = Object.assign(
  { log: bunyan.createLogger({ name: 'app_authorization' }) },
  require('./plugins/websites')
)

module.exports = appAuthorization

function appAuthorization (upstream) {
  return (req, res, next) => {
    const userID = req.headers['x-user']
    const websiteID = req.headers['x-website']
    if (!websiteID || req.url === '/login') {
      return upstream(req, res, next)
    }
    return fleet.getWebsite({ id: websiteID })
      .then(website =>
        (
          website &&
          website.owner !== userID &&
          website.users.indexOf(userID) === -1
        )
        ? Promise.reject(error(403))
        : upstream(req, res, next)
      )
      .catch(err => {
        if (err.statusCode === 403) {
          res.redirect(config.get('errorPages.forbidden'))
          return
        }
        next(err)
      })
  }
}
