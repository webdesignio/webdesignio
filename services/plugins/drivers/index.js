'use strict'

const { render } = require('mustache')

const drivers = {
  surge: require('./surge')
}

if (process.env.NODE_ENV !== 'production') {
  Object.assign(drivers, { static: require('./static') })
}

module.exports = {
  runDriver ({ name, website, language, output }) {
    const driver = drivers[name]
    const domain = render(website.config.domain || '', { language })
    return driver({ website, domain, language, log: this.log }, output)
  }
}
