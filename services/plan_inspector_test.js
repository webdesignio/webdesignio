import test from 'ava'
import listen from 'test-listen'
import fetch from 'node-fetch'
import micro from 'micro'
import { spy } from 'sinon'

import createPlanInspector from './plan_inspector'

test('extracts free limits', async t => {
  const user = { numberOfWebsites: 1 }
  const website = { users: ['1'] }
  const users = { findOne: spy(() => Promise.resolve(user)) }
  const websites = { findOne: spy(() => Promise.resolve(website)) }
  const upstream = spy(() => Promise.resolve(''))
  const planInspector = createPlanInspector({
    collections: { websites, users },
    services: { upstream }
  })
  const url = await listen(micro(planInspector))
  const res = await fetch(`${url}/test`, {
    headers: {
      'x-user': '123',
      'x-website': '123'
    }
  })
  t.is(res.status, 200)
  t.truthy(upstream.calledOnce)
  t.truthy(users.findOne.calledOnce)
  t.truthy(websites.findOne.calledOnce)
  const req = upstream.args[0][0]
  t.is(req.headers['x-user-number-of-websites'], user.numberOfWebsites + '')
  t.is(req.headers['x-website-number-of-users'], website.users.length + '')
  t.is(req.headers['x-plan-max-number-of-users'], '1')
  t.is(req.headers['x-plan-max-number-of-websites'], '1')
})

test('sets unlimited limits', async t => {
  const user = { numberOfWebsites: 1, plan: 'unlimited' }
  const website = { users: ['1'] }
  const users = { findOne: spy(() => Promise.resolve(user)) }
  const websites = { findOne: spy(() => Promise.resolve(website)) }
  const upstream = spy(() => Promise.resolve(''))
  const planInspector = createPlanInspector({
    collections: { websites, users },
    services: { upstream }
  })
  const url = await listen(micro(planInspector))
  const res = await fetch(`${url}/test`, {
    headers: {
      'x-user': '123',
      'x-website': '123'
    }
  })
  t.is(res.status, 200)
  const req = upstream.args[0][0]
  t.is(req.headers['x-user-number-of-websites'], user.numberOfWebsites + '')
  t.is(req.headers['x-website-number-of-users'], website.users.length + '')
  t.is(req.headers['x-plan-max-number-of-users'], 'Infinity')
  t.is(req.headers['x-plan-max-number-of-websites'], 'Infinity')
})

test('skips without user', async t => {
  const users = { findOne: spy(() => Promise.resolve(null)) }
  const websites = { findOne: spy(() => Promise.resolve(null)) }
  const upstream = spy(() => Promise.resolve(''))
  const planInspector = createPlanInspector({
    collections: { websites, users },
    services: { upstream }
  })
  const url = await listen(micro(planInspector))
  const res = await fetch(`${url}/test`, {
    headers: {}
  })
  t.is(res.status, 200)
  t.truthy(upstream.calledOnce)
  t.falsy(users.findOne.calledOnce)
  t.falsy(websites.findOne.calledOnce)
})
