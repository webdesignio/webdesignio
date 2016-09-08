'use strict'

module.exports = extractWebsiteID

function extractWebsiteID (upstream) {
  return (req, res, next) => {
    const host = hostnameof(req)
    if (!host) return null
    if (!host.split('.').length === 3) return null
    const vhost = host.split('.')[0]
    req.headers['x-website'] = vhost
    upstream(req, res, next)
  }
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
