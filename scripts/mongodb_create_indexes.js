'use strict'

const { MongoClient } = require('mongodb')
const config = require('config')
const co = require('co')

co(main)
  .then(() => {
    console.log()
    console.log('Done!')
    process.exit(0)
  })
  .catch(e => {
    console.error(e.stack)
    process.exit(0)
  })

function * main () {
  const db = yield MongoClient.connect(config.get('mongodb'))
  const users = db.collection('users')
  console.log('  Creating users.email, { unique: true } index ...')
  yield users.createIndex({ email: 1 }, { unique: true })
}
