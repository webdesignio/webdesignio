import test from 'ava'
import { stub } from 'sinon'
import listen from 'test-listen'
import http from 'http'
import fetch from 'node-fetch'

const websiteAPI = require('./website_api')

test('creates website with default values', async t => {
  const user = 'test-user-123'
  const insertOne = stub().returns(Promise.resolve(null))
  const service = websiteAPI({
    collection: {
      findOne: () => Promise.resolve(null),
      insertOne
    }
  })
  const url = await listen(http.createServer(service))
  const res = await fetch(`${url}?website=my-site`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-User': user },
    body: JSON.stringify({
      languages: ['en'],
      defaultLanguage: 'en'
    })
  })
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
  t.is(res.status, 201)
  t.truthy(insertOne.calledOnce)
  t.deepEqual(insertOne.args[0][0], expectedBody)
  t.deepEqual(body, expectedBody)
})

test('creates website with default values', async t => {
  const user = 'test-user-123'
  const existingWebsite = {
    _id: 'my-site-0001',
    owner: user,
    users: [],
    defaultLanguage: 'en',
    languages: ['en'],
    noLangFields: [],
    fieldKeys: [],
    fields: {},
    config: {}
  }
  const updateOne = stub().returns(Promise.resolve(null))
  const service = websiteAPI({
    collection: {
      findOne: () => Promise.resolve(existingWebsite),
      updateOne
    }
  })
  const url = await listen(http.createServer(service))
  const newFields = { my_field: { value: 1 } }
  const res = await fetch(`${url}?website=my-site`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-User': user },
    body: JSON.stringify({ fields: newFields })
  })
  t.is(res.status, 200)
  const body = await res.json()
  const expectedBody = {
    _id: body._id,
    owner: user,
    users: [],
    defaultLanguage: 'en',
    languages: ['en'],
    noLangFields: [],
    fieldKeys: [],
    fields: newFields,
    config: {}
  }
  t.deepEqual(body, expectedBody)
  t.truthy(updateOne.calledOnce)
  t.deepEqual(updateOne.args[0][0], { _id: existingWebsite._id })
  t.deepEqual(updateOne.args[0][1], { $set: expectedBody })
})

test('sends website', async t => {
  const user = 'test-user-123'
  const existingWebsite = {
    _id: 'my-site',
    owner: user,
    users: [],
    defaultLanguage: 'en',
    languages: ['en'],
    noLangFields: [],
    fieldKeys: [],
    fields: {},
    config: {}
  }
  const findOne = stub().returns(Promise.resolve(existingWebsite))
  const service = websiteAPI({ collection: { findOne } })
  const url = await listen(http.createServer(service))
  const res = await fetch(`${url}?website=${existingWebsite._id}`, {
    method: 'GET'
  })
  t.deepEqual(findOne.args[0][0], { _id: existingWebsite._id })
  t.is(res.status, 200)
  const body = await res.json()
  delete existingWebsite.config
  t.deepEqual(body, existingWebsite)
  t.truthy(findOne.calledOnce)
})
