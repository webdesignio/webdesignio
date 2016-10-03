'use strict'

const { inspect } = require('util')
const { randomBytes } = require('crypto')
const { MongoClient } = require('mongodb')
const co = require('co')
const read = require('read')
const Bluebird = require('bluebird')
const config = require('config')

const readAsync = Bluebird.promisify(read)
process.on('unhandledRejection', err => {
  console.log()
  console.log(err.stack)
  process.exit(0)
})
co(main)

function * main () {
  const db = yield MongoClient.connect(config.get('mongodb'))
  const services = db.collection('services')
  const id = yield readAsync({ prompt: 'Service ID: ' })
  const secret = randomBytes(48).toString('hex')
  const service = { _id: id, secret }
  console.log()
  console.log(inspect(service, { colors: true }))
  console.log()
  console.log('  Inserting service ...')
  yield services.insert(service)
  console.log('')
  console.log('Done!')
  process.exit()
}
