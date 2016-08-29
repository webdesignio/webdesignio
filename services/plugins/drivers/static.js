'use strict'

const { mkdir, cp } = require('shelljs')

module.exports = surge

function surge ({ website: { _id }, language }, dir) {
  const outDir = `${process.cwd()}/static_output/${_id}/${language}`
  mkdir('-p', outDir)
  cp('-R', dir + '/*', outDir)
}
