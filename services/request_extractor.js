'use strict'

const util = require('util')
const url = require('url')
const cookie = require('cookie')
const co = require('co')

const debuglog = util.debuglog('request_extractor')

module.exports = createRequestExtractor

function createRequestExtractor ({ services: { upstream } }) {
  return co.wrap(function * requestExtractor (req, res) {
    const parsedURL = url.parse(req.url, true)
    req.headers['x-jsonwebtoken'] = getToken(req, parsedURL) || ''
    req.headers['x-website'] = getWebsite(req, parsedURL) || ''
    debuglog('extracted website', req.headers['x-website'])
    return yield upstream(req, res)
  })

  function getWebsite (req, url) {
    if (url.query.website) return url.query.website
    const host = hostnameof(req)
    if (!host) return null
    if (!host.split('.').length === 3) return null
    const vhost = host.split('.')[0]
    return vhost
  }

  function hostnameof (req) {
    const host = req.headers.host
    if (!host) return
    const offset = host[0] === '['
      ? host.indexOf(']') + 1
      : 0
    const index = host.indexOf(':', offset)
    return index !== -1
      ? host.substring(0, index)
      : host
  }

  function getToken (req, url) {
    if (
      req.headers.authorization &&
      req.headers.authorization.split(' ')[0] === 'Bearer'
    ) {
      return req.headers.authorization.split(' ')[1]
    } else {
      const { token: queryToken } = url.query
      if (queryToken) return queryToken
      else {
        const { token } = cookie.parse(req.headers.cookie || '')
        return token
      }
    }
  }
}
