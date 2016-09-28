'use strict'

const url = require('url')
const co = require('co')

module.exports = createURLNormalization

function createURLNormalization ({ services: { upstream } }) {
  return co.wrap(function * urlNormalization (req, res) {
    if (req.headers['x-forwarded-proto'] === 'http') {
      res.writeHead(302, { 'Location': `https://${req.headers['host']}` })
      res.end('Redirecting ...')
      return null
    }
    const { hostname } = url.parse('http://' + req.headers['host'])
    const h = hostname.split('.')
    if (h.slice(-1)[0] === 'localhost') return yield upstream(req, res)
    if (h.length === 2 && !req.url.match(/^\/api\/v/)) {
      // Make sure we redirect to www
      res.writeHead(301, {
        'Location': `https://www.${h[0]}.${h[1]}${req.url}`
      })
      res.end('Redirecting ...')
      return null
    } else {
      return yield upstream(req, res)
    }
  })
}
