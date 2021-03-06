'use strict'

const co = require('co')
const { send } = require('micro')

module.exports = createAPI

function createAPI ({
  tokenAPI,
  deploymentAPI,
  websiteBuildingAPI,
  metaAPI,
  websiteAPI,
  recordAPI,
  assetAPI,
  userAPI
}) {
  const u = p => new RegExp('^' + p + '(.*)$')
  const services = [
    [u('/tokens'), tokenAPI],
    [u('/websites/deploy'), deploymentAPI],
    [u('/websites/build'), websiteBuildingAPI],
    [u('/meta'), metaAPI],
    [u('/websites'), websiteAPI],
    [u('/assets'), assetAPI],
    [u('/users'), userAPI],
    [u('/'), recordAPI]
  ]

  return co.wrap(function * api (req, res) {
    for (let [regex, service] of services) {
      const match = req.url.match(regex)
      if (match) {
        req.url =
          (!match[1] || match[1][0] !== '/')
            ? '/' + (match[1] || '')
            : match[1]
        return yield service(req, res)
      }
    }
    send(res, 200, { title: 'webdesignio API', version: '1' })
  })
}
