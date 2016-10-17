#!/usr/bin/env node

'use strict'

const { spawn } = require('child_process')

if (process.env.NODE_ENV !== 'production') {
  console.log('    - starting mongodb ...')
  spawn('mongod', ['--dbpath', 'data', '--quiet'], { stdio: 'inherit' })
  console.log('    - starting redis ...')
  spawn('redis-server', [], { stdio: 'inherit' })
  console.log('    - starting worker ...')
  spawn('nodemon', ['-w', 'services', '--', '-r', 'dotenv/config', 'services/worker'], { stdio: 'inherit' })
  console.log('    - starting engine and watching sources ...')
  console.log()
  spawn('nodemon', [
    '-w', 'server.js',
    '-w', 'services',
    '--', '-r', 'dotenv/config', 'server'
  ], { stdio: 'inherit' })
} else {
  require('../server')
}
