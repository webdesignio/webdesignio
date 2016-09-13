'use strict'

const util = require('util')
const url = require('url')
const co = require('co')
const { createError, sendError } = require('micro')
const p = require('path-to-regexp')

const debuglog = util.debuglog('editable')

module.exports = createEditable

function createEditable ({ getGfs, errorPages }) {
  const regexes = {
    index: p('/'),
    page: p('/:id'),
    object: p('/:type/:id')
  }
  return co.wrap(function * editable (req, res) {
    const { pathname } = url.parse(req.url)
    const websiteID = req.headers['x-website']
    if (!websiteID) throw createError(404)
    let match
    if ((match = pathname.match(regexes.object))) {
      return serveObject(req, res, { website: websiteID, type: match[1] })
    } else if ((match = pathname.match(regexes.page))) {
      return servePage(req, res, { website: websiteID, id: match[1] })
    } else if ((match = pathname.match(regexes.index))) {
      return servePage(req, res, { website: websiteID, id: 'index' })
    } else {
      res.writeHead(302, {
        'Location': errorPages.notFound,
        'Content-Type': 'text/plain'
      })
      res.end('Redirecting ...')
      return
    }
  })

  function servePage (req, res, { website, id }) {
    const query = { 'metadata.website': website, filename: `pages/${id}` }
    return serveFile(req, res, { query })
  }

  function serveObject (req, res, { website, type }) {
    const query = { 'metadata.website': website, filename: `objects/${type}` }
    return serveFile(req, res, { query })
  }

  function serveFile (req, res, { query }) {
    const gfs = getGfs()
    gfs.files.findOne(query)
      .then(file => file || Promise.reject(createError(404)))
      .then(({ _id, length }) => {
        debuglog('streaming', query, 'with id', _id)
        const readStream = gfs.createReadStream({ _id })
        res.writeHeader(200, {
          'Content-Type': 'text/html',
          'Content-Length': length
        })
        readStream
          .on('error', e => sendError(req, res, e))
          .pipe(res)
      })
      .catch(e => sendError(req, res, e))
    return null
  }
}
