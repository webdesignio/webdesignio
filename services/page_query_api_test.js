import test from 'ava'
import listen from 'test-listen'
import fetch from 'node-fetch'
import micro from 'micro'
import { spy } from 'sinon'

import createPageQueryAPI from './page_query_api'

test('sends existing page', async t => {
  const website = { _id: 'website' }
  const page = { _id: 'my page' }
  const collections = {
    websites: { findOne: spy(() => Promise.resolve(website)) },
    pages: { findOne: spy(() => Promise.resolve(page)) }
  }
  const pageQueryAPI = createPageQueryAPI({ collections })
  const url = await listen(micro(pageQueryAPI))
  const req = {
    method: 'GET',
    headers: {
      'x-website': 'website',
      'x-page': 'my page',
      'x-user': 'user'
    }
  }
  const res = await fetch(`${url}`, req)
  t.is(res.status, 200)
  t.truthy(collections.websites.findOne.calledOnce)
  t.deepEqual(collections.websites.findOne.args[0][0], {
    _id: req.headers['x-website'],
    $or: [
      { owner: req.headers['x-user'] },
      { users: req.headers['x-user'] },
      { collaborators: req.headers['x-user'] }
    ]
  })
  t.deepEqual(collections.pages.findOne.args[0][0], {
    website: req.headers['x-website'],
    name: req.headers['x-page']
  })
  const body = await res.json()
  t.deepEqual(body, page)
})

test('rejects because of invalid website', async t => {
  const page = { _id: 'my page' }
  const collections = {
    websites: { findOne: spy(() => Promise.resolve(null)) },
    pages: { findOne: spy(() => Promise.resolve(page)) }
  }
  const pageQueryAPI = createPageQueryAPI({ collections })
  const url = await listen(micro(pageQueryAPI))
  const req = {
    method: 'GET',
    headers: {
      'x-website': 'website',
      'x-page': 'my page',
      'x-user': 'user'
    }
  }
  const res = await fetch(`${url}`, req)
  t.is(res.status, 404)
  t.truthy(collections.websites.findOne.calledOnce)
})

test('sends default page', async t => {
  const website = { _id: 'website' }
  const collections = {
    websites: { findOne: spy(() => Promise.resolve(website)) },
    pages: { findOne: spy(() => Promise.resolve(null)) }
  }
  const pageQueryAPI = createPageQueryAPI({ collections })
  const url = await listen(micro(pageQueryAPI))
  const req = {
    method: 'GET',
    headers: {
      'x-website': 'website',
      'x-page': 'my page',
      'x-user': 'user'
    }
  }
  const res = await fetch(`${url}`, req)
  t.is(res.status, 200)
  t.truthy(collections.websites.findOne.calledOnce)
  t.deepEqual(collections.websites.findOne.args[0][0], {
    _id: req.headers['x-website'],
    $or: [
      { owner: req.headers['x-user'] },
      { users: req.headers['x-user'] },
      { collaborators: req.headers['x-user'] }
    ]
  })
  t.deepEqual(collections.pages.findOne.args[0][0], {
    website: req.headers['x-website'],
    name: req.headers['x-page']
  })
  const body = await res.json()
  t.deepEqual(body, {
    name: req.headers['x-page'],
    website: req.headers['x-website'],
    fields: {}
  })
})
