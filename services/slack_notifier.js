'use strict'

const url = require('url')
const https = require('https')
const co = require('co')

module.exports = createSlackNotifier

function createSlackNotifier ({ url: u }) {
  const parsedURL = url.parse(u)
  return co.wrap(function * slackNotifier (msg) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('   > ' + require('chalk').cyan.bold(msg.text))
      return
    }
    https.request(Object.assign({}, parsedURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }))
    .on('error', err => console.log(err.stack))
    .end(JSON.stringify(msg))
  })
}
