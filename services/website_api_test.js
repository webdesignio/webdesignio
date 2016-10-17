import test from 'ava'
import { stub } from 'sinon'
import listen from 'test-listen'
import fetch from 'node-fetch'
import micro from 'micro'

const websiteAPI = require('./website_api')

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
  const service = websiteAPI({ collections: { websites: { findOne } }, services: {} })
  const url = await listen(micro(service))
  const res = await fetch(`${url}?website=${existingWebsite._id}`, {
    method: 'GET',
    headers: { 'X-User': '123' }
  })
  t.deepEqual(findOne.args[0][0], { _id: existingWebsite._id })
  t.is(res.status, 200)
  const body = await res.json()
  delete existingWebsite.config
  t.deepEqual(body, existingWebsite)
  t.truthy(findOne.calledOnce)
})
