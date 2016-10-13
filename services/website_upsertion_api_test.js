import test from 'ava'
import { stub, spy } from 'sinon'
import listen from 'test-listen'
import fetch from 'node-fetch'
import micro from 'micro'

const createWebsiteUpsertionAPI = require('./website_upsertion_api')

test('creates website with default values', async t => {
  const user = 'test-user-123'
  const insertOne = stub().returns(Promise.resolve(null))
  const websites = {
    findOne: () => Promise.resolve(null),
    insertOne
  }
  const users = {
    update: spy(() => Promise.resolve({ result: { nModified: 1 } }))
  }
  const service = createWebsiteUpsertionAPI({
    collections: { websites, users }
  })
  const url = await listen(micro(service))
  const res = await fetch(`${url}?website=my-site`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-User': user,
      'x-plan-max-number-of-users': '1',
      'x-plan-max-number-of-websites': '1',
      'x-user-number-of-websites': '0'
    },
    body: JSON.stringify({
      languages: ['en'],
      defaultLanguage: 'en'
    })
  })
  t.is(res.status, 201)
  const body = await res.json()
  const expectedBody = {
    _id: body._id,
    owner: user,
    users: [],
    defaultLanguage: 'en',
    languages: ['en'],
    noLangFields: [],
    fieldKeys: [],
    fields: {},
    config: {}
  }
  t.truthy(insertOne.calledOnce)
  t.deepEqual(insertOne.args[0][0], expectedBody)
  t.deepEqual(body, expectedBody)
})

test('rejects to create website that exceeds the plan', async t => {
  const user = 'test-user-123'
  const websites = { findOne: () => Promise.resolve(null) }
  const users = {}
  const service = createWebsiteUpsertionAPI({
    collections: { websites, users }
  })
  const url = await listen(micro(service))
  const res = await fetch(`${url}?website=my-site`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-User': user,
      'x-plan-max-number-of-users': '1',
      'x-plan-max-number-of-websites': '1',
      'x-user-number-of-websites': '1'
    },
    body: JSON.stringify({
      languages: ['en'],
      defaultLanguage: 'en'
    })
  })
  t.is(res.status, 403)
})

test('updates website with default values', async t => {
  const user = 'test-user-123'
  const existingWebsite = {
    _id: 'my-site-0001',
    owner: 'user',
    users: [user],
    defaultLanguage: 'en',
    languages: ['en'],
    noLangFields: [],
    fieldKeys: [],
    fields: {},
    config: {}
  }
  const updateOne = stub().returns(Promise.resolve(null))
  const service = createWebsiteUpsertionAPI({
    collections: {
      websites: {
        findOne: () => Promise.resolve(existingWebsite),
        updateOne
      }
    }
  })
  const url = await listen(micro(service))
  const newFields = { my_field: { value: 1 } }
  const res = await fetch(`${url}?website=my-site`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-User': user,
      'x-plan-max-number-of-users': '1',
      'x-plan-max-number-of-websites': '1',
      'x-user-number-of-websites': '1'
    },
    body: JSON.stringify({ fields: newFields })
  })
  t.is(res.status, 200)
  const body = await res.json()
  const expectedBody = {
    _id: body._id,
    owner: 'user',
    users: [user],
    defaultLanguage: 'en',
    languages: ['en'],
    noLangFields: [],
    fieldKeys: [],
    fields: newFields,
    config: {}
  }
  t.deepEqual(body, expectedBody)
  t.truthy(updateOne.calledOnce)
  t.deepEqual(updateOne.args[0][0], { _id: 'my-site' })
  t.deepEqual(updateOne.args[0][1], { $set: expectedBody })
})

test('rejects website update that exceeds user limit', async t => {
  const user = 'test-user-123'
  const existingWebsite = {
    _id: 'my-site-0001',
    owner: user,
    users: ['1', '2'],
    defaultLanguage: 'en',
    languages: ['en'],
    noLangFields: [],
    fieldKeys: [],
    fields: {},
    config: {}
  }
  const service = createWebsiteUpsertionAPI({
    collections: {
      websites: { findOne: () => Promise.resolve(existingWebsite) }
    }
  })
  const url = await listen(micro(service))
  const newFields = { my_field: { value: 1 } }
  const res = await fetch(`${url}?website=my-site`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-User': user,
      'x-plan-max-number-of-users': '1',
      'x-plan-max-number-of-websites': '1',
      'x-user-number-of-websites': '1'
    },
    body: JSON.stringify({ fields: newFields })
  })
  t.is(res.status, 403)
})
