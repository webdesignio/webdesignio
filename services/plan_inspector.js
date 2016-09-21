'use strict'

const co = require('co')

module.exports = createPlanInspector

function createPlanInspector ({
  collections: { users, websites },
  services: { upstream }
}) {
  return co.wrap(function * planInspector (req, res) {
    const user = yield users.findOne({ _id: req.headers['x-user'] })
    const website = req.headers['x-website']
      ? yield websites.findOne({ _id: req.headers['x-website'] })
      : null
    const planBoundaries = calculatePlanBoundaries({ user, website })
    Object.keys(planBoundaries).forEach(key => {
      req.headers['x-' + key] = String(planBoundaries[key])
    })
    return yield upstream(req, res)
  })
}

function calculatePlanBoundaries ({ user, website }) {
  let maxNumberOfWebsites
  let maxNumberOfUsers
  switch (user.plan) {
    case 'unlimited':
      maxNumberOfWebsites = maxNumberOfUsers = Infinity
      break
    default:
      maxNumberOfUsers = maxNumberOfWebsites = 1
      break
  }
  const currentNumberOfWebsites = user.numberOfWebsites || 0
  const currentNumberOfUsers = website ? website.users.length : 0
  return {
    'user-number-of-websites': currentNumberOfWebsites,
    'website-number-of-users': currentNumberOfUsers,
    'plan-max-number-of-websites': maxNumberOfWebsites,
    'plan-max-number-of-users': maxNumberOfUsers
  }
}
