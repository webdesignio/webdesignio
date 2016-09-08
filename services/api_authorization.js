'use strict'

const error = require('http-errors')

const { handleJSONError } = require('../lib/error_handlers')

const fleet = Object.assign(
  {},
  require('./plugins/websites')
)

module.exports = apiAuthorization

function apiAuthorization (upstream) {
  return (req, res, next) => {
    const userID = req.headers['x-user']
    const websiteID = req.query.website
    if (!websiteID) return upstream(req, res, next)
    return fleet.getWebsite({ id: websiteID })
      .then(website =>
        (
          website &&
          website.owner !== userID &&
          website.users.indexOf(userID) === -1
        )
        ? Promise.reject(error(403, 'Sorry, you don\'t have access here.'))
        : upstream(req, res, next)
      )
      .catch(err => handleJSONError(err, req, res, next))
  }
}
