'use strict'

const express = require('express')

const { handleAppError } = require('../lib/error_handlers')

const app = module.exports = express()

app.use(require('./extract_website'))
app.use('/login', require('./login'))
app.use(require('./editable'))
app.use(handleAppError)
