import { createServer } from 'http'
import test from 'ava'
import fetch from 'node-fetch'
import listen from 'test-listen'
import { spy } from 'sinon'
import { sign } from 'jsonwebtoken'

import appAuthorization from './app_authorization'

test('passes /login', async t => {
  const app = spy((req, res) => res.end())
  const url = await listen(createServer(appAuthorization({ app })))
  const res = await fetch(`${url}/login`)
  t.is(res.status, 200)
  t.truthy(app.calledOnce)
})

test('rejects without token', async t => {
  const app = spy((req, res) => res.end())
  const website = {}
  const websites = { findOne () { return website } }
  const secret = 'foobar'
  const url = await listen(createServer(appAuthorization({ app, secret, websites })))
  const res = await fetch(`${url}`, {
    redirect: 'manual',
    headers: { cookie: '' }
  })
  t.is(res.status, 302)
  t.is(res.headers._headers.location[0], `${url}/login`)
  t.falsy(app.calledOnce)
})

test('rejects with invalid token', async t => {
  const app = spy((req, res) => res.end())
  const website = {}
  const websites = { findOne () { return website } }
  const secret = 'foobar'
  const url = await listen(createServer(appAuthorization({ app, secret, websites })))
  const res = await fetch(`${url}`, {
    redirect: 'manual',
    headers: { cookie: 'token=123' }
  })
  t.is(res.status, 302)
  t.is(res.headers._headers.location[0], `${url}/login`)
  t.falsy(app.calledOnce)
})

test('sends not-found with valid user and non-existent website', async t => {
  const app = spy((req, res) => res.end())
  const website = null
  const user = { _id: '1', isActive: true }
  const websites = { findOne () { return website } }
  const users = { findOne () { return user } }
  const secret = 'foobar'
  const token = sign({ user: '1' }, secret)
  const errorPages = { notFound: 'notfound' }
  const url = await listen(createServer(appAuthorization({
    app,
    secret,
    users,
    websites,
    errorPages
  })))
  const res = await fetch(`${url}`, {
    redirect: 'manual',
    headers: { cookie: `token=${token}` }
  })
  t.is(res.status, 302)
  t.is(res.headers._headers.location[0], `${url}/${errorPages.notFound}`)
  t.falsy(app.calledOnce)
})

test('sends forbidden with valid user and valid website', async t => {
  const app = spy((req, res) => res.end())
  const website = { owner: '', users: [] }
  const user = { _id: '1', isActive: true }
  const websites = { findOne () { return website } }
  const users = { findOne () { return user } }
  const secret = 'foobar'
  const token = sign({ user: '1' }, secret)
  const errorPages = { forbidden: 'forbidden' }
  const url = await listen(createServer(appAuthorization({
    app,
    secret,
    users,
    websites,
    errorPages
  })))
  const res = await fetch(`${url}`, {
    redirect: 'manual',
    headers: { cookie: `token=${token}` }
  })
  t.is(res.status, 302)
  t.is(res.headers._headers.location[0], `${url}/${errorPages.forbidden}`)
  t.falsy(app.calledOnce)
})

test('passes with owner user and valid website', async t => {
  const app = spy((req, res) => res.end())
  const website = { owner: '1', users: [] }
  const user = { _id: '1', isActive: true }
  const websites = { findOne () { return website } }
  const users = { findOne () { return user } }
  const secret = 'foobar'
  const token = sign({ user: '1' }, secret)
  const url = await listen(createServer(appAuthorization({
    app,
    secret,
    users,
    websites
  })))
  const res = await fetch(`${url}`, {
    redirect: 'manual',
    headers: { cookie: `token=${token}` }
  })
  t.is(res.status, 200)
  t.truthy(app.calledOnce)
})

test('passes with website user and valid website', async t => {
  const app = spy((req, res) => res.end())
  const website = { owner: '', users: ['1'] }
  const user = { _id: '1', isActive: true }
  const websites = { findOne () { return website } }
  const users = { findOne () { return user } }
  const secret = 'foobar'
  const token = sign({ user: '1' }, secret)
  const url = await listen(createServer(appAuthorization({
    app,
    secret,
    users,
    websites
  })))
  const res = await fetch(`${url}`, {
    redirect: 'manual',
    headers: { cookie: `token=${token}` }
  })
  t.is(res.status, 200)
  t.truthy(app.calledOnce)
})
