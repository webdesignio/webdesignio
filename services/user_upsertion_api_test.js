import test from 'ava'
import { spy, stub } from 'sinon'
import listen from 'test-listen'
import micro from 'micro'
import fetch from 'node-fetch'

import createUpsertionAPI from './user_upsertion_api'

test('creates a user', async t => {
  const slackNotifier = stub().returns(null)
  const users = {
    insert: spy(() => Promise.resolve())
  }
  const userUpsertionAPI = createUpsertionAPI({
    collections: { users },
    services: { slackNotifier }
  })
  const url = await listen(micro(userUpsertionAPI))
  const body = { email: 'my@user.me', password: 'test' }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  t.is(res.status, 201)
  t.truthy(users.insert.calledOnce)
  t.truthy(users.insert.args[0][0]._id)
  t.is(users.insert.args[0][0].email, body.email)
  t.truthy(users.insert.args[0][0].isActive)
  t.truthy(users.insert.args[0][0].hash)
  t.truthy(slackNotifier.calledOnce)
})

test('fails to create duplicate user', async t => {
  const slackNotifier = stub().returns(null)
  const users = {
    insert: spy(() => {
      const err = new Error()
      err.name = 'MongoError'
      err.code = 11000
      return Promise.reject(err)
    })
  }
  const userUpsertionAPI = createUpsertionAPI({
    collections: { users },
    services: { slackNotifier }
  })
  const url = await listen(micro(userUpsertionAPI))
  const body = { email: 'my@user.me', password: 'test' }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  t.is(res.status, 409)
  t.truthy(users.insert.calledOnce)
  t.deepEqual(users.insert.args[0][0].email, body.email)
  t.truthy(users.insert.args[0][0].isActive)
  t.truthy(users.insert.args[0][0].hash)
  t.falsy(slackNotifier.called && slackNotifier.calledOnce)
})
