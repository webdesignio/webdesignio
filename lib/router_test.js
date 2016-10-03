import test from 'ava'
import createRouter from './router'

test('rewrites url properly', t => {
  const router = createRouter([
    [/^\/test$/, 42]
  ])
  const r = router.match('/test?foo=bar')
  t.is(r.url, '/?foo=bar')
})
