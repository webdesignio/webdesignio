'use strict'

const util = require('util')
const co = require('co')

const debuglog = util.debuglog('app')

module.exports = createApp

function createApp ({ services: { api, login, editable } }) {
  const apiRegExp = /^\/api\/v1/

  return co.wrap(function * app (req, res) {
    if (req.url.match(apiRegExp)) {
      req.url = req.url.replace(apiRegExp, '')
      debuglog('proxy to api ' + req.url)
      return yield api(req, res)
    } else if (req.url === '/login') {
      debuglog('proxy to login')
      return yield login(req, res)
    } else {
      debuglog('proxy to editable')
      return yield editable(req, res)
    }
  })
}
