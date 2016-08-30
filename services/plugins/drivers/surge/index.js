'use strict'

const { spawn } = require('child_process')
const { find } = require('shelljs')
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
    console.log(find(dir).slice(0))
    const surge = spawn(path, ['-d', realDomain, '-p', '.'], {
      cwd: dir,
      env: Object.assign({}, process.env, {
        SURGE_LOGIN: email,
        SURGE_TOKEN: token
      }),
      stdio: 'inherit'
    })
    surge.on('error', reject)
    surge.on('exit', () => { console.log('close'); resolve() })
  })
}
