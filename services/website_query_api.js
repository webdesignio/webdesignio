'use strict'

const co = require('co')
const { send, createError } = require('micro')

module.exports = createWebsiteQueryAPI

function createWebsiteQueryAPI ({ collections: { websites } }) {
  return co.wrap(function * websiteQueryAPI (req, res) {
    const website = yield websites.findOne({ _id: req.headers['x-website'] })
    if (!website) throw createError(404)
    const isOwner = (website.owner === req.headers['x-user'])
    const isCollaborator =
      isOwner ||
      (website.collaborators &&
        website.collaborators.includes(req.headers['x-user']))
    const isUser = isCollaborator || website.users.includes(req.headers['x-user'])
    if (isCollaborator) {
      return website
    } else if (isUser) {
      return Object.assign({}, website, {
        config: null
      })
    } else {
      send(res, 204)
      return null
    }
  })
}
