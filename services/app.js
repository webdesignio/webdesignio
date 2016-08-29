'use strict'

const express = require('express')

const app = module.exports = express()

app.use('/login', require('./login'))
app.use(require('./editable'))
