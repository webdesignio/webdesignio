'use strict'

const { render } = require('mustache')

const drivers = {
  surge: require('./surge')
}

module.exports = {
  runDriver ({ name, website, language, output }) {
    const driver = drivers[name]
    const domain = render(website.config.domain || '', { language })
    this.log.info('deploying', output, 'to', domain)
    return driver({ website, domain, language, log: this.log }, output)
  }
}
