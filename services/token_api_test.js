import test from 'ava'
import micro from 'micro'
import listen from 'test-listen'
import { spy } from 'sinon'
import fetch from 'node-fetch'
import bcrypt from 'bcrypt'
import Bluebird from 'bluebird'

import createTokenAPI from './token_api'

const hashAsync = Bluebird.promisify(bcrypt.hash)
const genSaltAsync = Bluebird.promisify(bcrypt.genSalt)

test('create simple token', async t => {
  const secret = 'keyboard cat'
  const salt = await genSaltAsync()
  const password = 'pwd!'
  const hash = await hashAsync(password, salt)
  const user = { email: 'db@domachine.de', hash }
  const users = { findOne: spy(() => Promise.resolve(user)) }
  const tokenAPI = createTokenAPI({ users, secret })
  const url = await listen(micro(tokenAPI))
  const res = await fetch(`${url}/api/v1/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password })
  })
  t.is(res.status, 201)
  const { token } = await res.json()
  t.truthy(token)
})

test('sends 401 due to invalid password', async t => {
  const secret = 'keyboard cat'
  const salt = await genSaltAsync()
  const password = 'pwd!'
  const hash = await hashAsync(password, salt)
  const user = { email: 'db@domachine.de', hash }
  const users = { findOne: spy(() => Promise.resolve(user)) }
  const tokenAPI = createTokenAPI({ users, secret })
  const url = await listen(micro(tokenAPI))
  const res = await fetch(`${url}/api/v1/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: 'pw' })
  })
  t.is(res.status, 401)
})
