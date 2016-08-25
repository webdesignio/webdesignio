'use strict'

const { spawn } = require('child_process')
const shortid = require('shortid')

module.exports = surge

function surge (
  {
    website: {
      _id,
      config: { surge: { email, token } }
    },
    domain,
    language,
    log
  },
  dir
) {
  const realDomain = domain || `${_id}-${shortid()}-${language}.surge.sh`
  return new Promise((resolve, reject) => {
    const path = process.env.PATH.split(':')[1] + '/surge'
    const surge = spawn(path, ['-d', realDomain, '-p', '.'], {
      cwd: dir,
      env: Object.assign({}, process.env, {
        SURGE_LOGIN: email,
        SURGE_TOKEN: token
      })
    })
    surge.stdout.on('data', d => log.info(d.toString('utf-8')))
    surge.stderr.on('data', d => log.info(d.toString('utf-8')))
    surge.on('error', reject)
    surge.on('close', resolve)
  })
}
