import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizeBase, routerBasename } from '../src/lib/base.ts'

describe('normalizeBase', () => {
  it('defaults to the site root', () => {
    assert.equal(normalizeBase(undefined), '/')
    assert.equal(normalizeBase(''), '/')
    assert.equal(normalizeBase('/'), '/')
  })

  it('adds a trailing slash to a subpath', () => {
    assert.equal(normalizeBase('/scanner'), '/scanner/')
    assert.equal(normalizeBase('/functions/v1/dashboard/'), '/functions/v1/dashboard/')
    assert.equal(normalizeBase('repo'), '/repo/')
  })

  it('keeps only the pathname of an absolute URL', () => {
    assert.equal(normalizeBase('https://example.github.io/scanner'), '/scanner/')
  })
})

describe('routerBasename', () => {
  it('omits a basename at the root', () => {
    assert.equal(routerBasename('/'), undefined)
    assert.equal(routerBasename(undefined), undefined)
  })

  it('drops the trailing slash Vite adds', () => {
    assert.equal(routerBasename('/scanner/'), '/scanner')
    assert.equal(routerBasename('/functions/v1/dashboard/'), '/functions/v1/dashboard')
  })
})
