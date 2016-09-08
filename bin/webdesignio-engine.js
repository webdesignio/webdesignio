#!/usr/bin/env node

'use strict'

const yargs = require('yargs')
const mongoose = require('mongoose')
const config = require('config')
const read = require('read')
const Bluebird = require('bluebird')

const { createUser } = require('../services/plugins/users')

const readAsync = Bluebird.promisify(read)
const argv = yargs
  .usage('    $0 <command> [options] [args]')
  .command('run', 'Start a new cluster')
  .command('create-user', 'Create a user', {
    email: { alias: 'e', required: true }
  })
  .demand(1)
  .argv

if (argv._[0] === 'run') {
  require('../server')
} else if (argv._[0] === 'worker') {
  require('../services/worker')
} else if (argv._[0] === 'create-user') {
  mongoose.Promise = Promise
  mongoose.connect(config.get('mongodb'))
  if (!argv.email) error(new Error('No E-Mail given'))
  const { email } = argv
  readAsync({ prompt: 'Password: ', silent: true, replace: '*' })
    .then(password => {
      if (!password) throw new Error('Password is empty!')
      return createUser({ email, password })
    })
    .then(user => {
      mongoose.disconnect()
      console.log(`Created user ${email} with id ${user._id}`)
    })
    .catch(error)
}

function error (e) {
  console.error(e.stack)
  process.exit(1)
}
