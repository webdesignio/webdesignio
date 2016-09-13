import test from 'ava'
import fetch from 'node-fetch'
import listen from 'test-listen'
import { spy } from 'sinon'
import { sign } from 'jsonwebtoken'
import compose from 'lodash/fp/compose'
import micro from 'micro'

import createAuthorization from './auth'

const createSrv = compose(listen, micro, createAuthorization)

test('passes /login', async t => {
  const app = spy((req, res) => ({}))
  const url = await createSrv({ services: { app }, collections: {} })
  const res = await fetch(`${url}/login`)
  t.is(res.status, 200)
  t.truthy(app.calledOnce)
})

test('rejects without token', async t => {
  const app = spy((req, res) => ({}))
  const website = {}
  const websites = { findOne () { return website } }
  const secret = 'foobar'
  const url = await createSrv({ services: { app }, secret, collections: { websites } })
  const res = await fetch(`${url}`, {
    redirect: 'manual',
    headers: { cookie: '' }
  })
  t.is(res.status, 302)
  t.is(res.headers._headers.location[0], `${url}/login`)
  t.falsy(app.calledOnce)
})

test('rejects with invalid token', async t => {
  const app = spy((req, res) => ({}))
  const website = {}
  const websites = { findOne () { return website } }
  const secret = 'foobar'
  const url = await createSrv({ services: { app }, secret, collections: { websites } })
  const res = await fetch(`${url}`, {
    redirect: 'manual',
    headers: { cookie: 'token=123' }
  })
  t.is(res.status, 302)
  t.is(res.headers._headers.location[0], `${url}/login`)
  t.falsy(app.calledOnce)
})

test('sends forbidden with valid user and valid website', async t => {
  const app = spy((req, res) => ({}))
  const website = { owner: '', users: [] }
  const user = { _id: '1', isActive: true }
  const websites = { findOne () { return website } }
  const users = { findOne () { return user } }
  const secret = 'foobar'
  const token = sign({ user: '1' }, secret)
  const errorPages = { forbidden: 'forbidden' }
  const url = await createSrv({
    secret,
    errorPages,
    collections: { users, websites },
    services: { app }
  })
  const res = await fetch(`${url}`, {
    redirect: 'manual',
    headers: { 'x-jsonwebtoken': token }
  })
  t.is(res.status, 302)
  t.is(res.headers._headers.location[0], `${url}/${errorPages.forbidden}`)
  t.falsy(app.calledOnce)
})

test('passes with owner user and valid website', async t => {
  const app = spy((req, res) => ({}))
  const website = { owner: '1', users: [] }
  const user = { _id: '1', isActive: true }
  const websites = { findOne () { return website } }
  const users = { findOne () { return user } }
  const secret = 'foobar'
  const token = sign({ user: '1' }, secret)
  const url = await createSrv({
    secret,
    collections: { users, websites },
    services: { app }
  })
  const res = await fetch(`${url}`, {
    redirect: 'manual',
    headers: { 'x-jsonwebtoken': token }
  })
  t.is(res.status, 200)
  t.truthy(app.calledOnce)
})

test('passes with website user and valid website', async t => {
  const app = spy((req, res) => ({}))
  const website = { owner: '', users: ['1'] }
  const user = { _id: '1', isActive: true }
  const websites = { findOne () { return website } }
  const users = { findOne () { return user } }
  const secret = 'foobar'
  const token = sign({ user: '1' }, secret)
  const url = await createSrv({
    secret,
    collections: { users, websites },
    services: { app }
  })
  const res = await fetch(`${url}`, {
    redirect: 'manual',
    headers: { 'x-jsonwebtoken': token }
  })
  t.is(res.status, 200)
  t.truthy(app.calledOnce)
})
