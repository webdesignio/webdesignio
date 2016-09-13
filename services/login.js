'use strict'

const { urlencoded } = require('body-parser')
const co = require('co')
const { sendError } = require('micro')

module.exports = createLogin

function createLogin ({ getGfs, errorPages }) {
  const parser = urlencoded({ extended: false })
  return co.wrap(function * login (req, res) {
    if (req.method === 'GET') {
      const gfs = getGfs()
      const file = yield gfs.files.findOne({
        filename: 'pages/login',
        'metadata.website': req.headers['x-website']
      })
      if (!file) {
        res.writeHead(302, {
          'Location': errorPages.notFound,
          'Content-Type': 'text/plain'
        })
        res.end('Redirecting ...')
        return null
      }
      res.writeHeader(200, { 'Content-Type': 'text/html' })
      gfs.createReadStream({ _id: file._id })
        .on('error', e => sendError(req, res, e))
        .pipe(res)
      return null
    } else {
      const { token } = yield new Promise((resolve, reject) =>
        parser(req, res, err => err ? reject(err) : resolve(req.body))
      )
      res.writeHead(302, {
        'Location': '/',
        'Set-Cookie': `token=${token}; Path=/`
      })
      res.end('Redirecting ...')
      return null
    }
  })
}
