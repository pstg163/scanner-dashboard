import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  applyClientFilters,
  formatRelative,
  mergeAlerts,
  nextPollCursor,
  priorityMeta,
} from '../src/lib/alerts.ts'
import { isPin } from '../src/lib/pin.ts'
import type { Alert } from '../src/types.ts'

function row(partial: Partial<Alert> & Pick<Alert, 'id' | 'event_time'>): Alert {
  return {
    created_at: partial.event_time,
    updated_at: partial.updated_at ?? partial.event_time,
    event_ts: null,
    county: 'Monroe',
    town: 'Rochester',
    address: null,
    lat: null,
    lng: null,
    category: 'MEDICAL',
    priority: 4,
    title: partial.id,
    summary: null,
    transcript: null,
    snippet: null,
    source_type: 'radio',
    source_feed_id: null,
    source_name: null,
    source_url: null,
    clip_path: null,
    dedupe_key: null,
    is_update: false,
    is_merged: false,
    escalations: [],
    tags: null,
    geocode_status: null,
    ...partial,
  }
}

describe('mergeAlerts', () => {
  it('replaces the previous list and sorts newest event first', () => {
    const older = row({ id: 'a', event_time: '2026-11-17T12:00:00.000Z' })
    const newer = row({ id: 'b', event_time: '2026-11-17T13:00:00.000Z', title: 'Newer' })
    const merged = mergeAlerts([older], [newer, older], 'replace')
    assert.deepEqual(merged.map((alert) => alert.id), ['b', 'a'])
    assert.equal(merged[0]?.title, 'Newer')
  })

  it('updates an existing id in place', () => {
    const original = row({ id: 'a', event_time: '2026-11-17T12:00:00.000Z', summary: 'first' })
    const update = row({ id: 'a', event_time: '2026-11-17T12:00:00.000Z', summary: 'second', is_update: true })
    const other = row({ id: 'b', event_time: '2026-11-17T11:00:00.000Z' })
    const merged = mergeAlerts([other, original], [update], 'merge')
    assert.equal(merged.find((alert) => alert.id === 'a')?.summary, 'second')
    assert.equal(merged.length, 2)
  })
})

describe('nextPollCursor', () => {
  it('drains immediately when a page is full and the cursor moved', () => {
    const step = nextPollCursor({ count: 100, limit: 100, pollAfter: '2026-11-17T13:00:00.000Z' }, null)
    assert.equal(step.drain, true)
    assert.equal(step.cursor, '2026-11-17T13:00:00.000Z')
  })

  it('waits when the page is short', () => {
    const step = nextPollCursor({ count: 6, limit: 100, pollAfter: '2026-11-17T13:00:00.000Z' }, '2026-11-17T12:00:00.000Z')
    assert.equal(step.drain, false)
  })

  it('stops if the cursor does not advance', () => {
    const since = '2026-11-17T13:00:00.000Z'
    const step = nextPollCursor({ count: 100, limit: 100, pollAfter: since }, since)
    assert.equal(step.drain, false)
  })
})

describe('applyClientFilters', () => {
  const now = Date.parse('2026-11-17T16:00:00.000Z')
  const recent = row({ id: 'recent', event_time: '2026-11-17T15:30:00.000Z', town: 'Victor', summary: 'shots fired' })
  const old = row({ id: 'old', event_time: '2026-11-16T12:00:00.000Z', town: 'Auburn' })

  it('keeps alerts inside the time window', () => {
    const kept = applyClientFilters([recent, old], { q: '', range: '1h' }, now)
    assert.deepEqual(kept.map((alert) => alert.id), ['recent'])
  })

  it('searches town and summary', () => {
    const kept = applyClientFilters([recent, old], { q: 'auburn', range: '7d' }, now)
    assert.deepEqual(kept.map((alert) => alert.id), ['old'])
  })
})

describe('formatters and pin', () => {
  it('formats a recent time', () => {
    const now = Date.parse('2026-11-17T16:00:00.000Z')
    assert.equal(formatRelative('2026-11-17T15:54:00.000Z', now), '6m ago')
  })

  it('labels priorities', () => {
    assert.equal(priorityMeta(5).tone, 'urgent')
    assert.equal(priorityMeta(4).label, 'Serious')
    assert.equal(priorityMeta(2).tone, 'quiet')
  })

  it('accepts only 6 digits', () => {
    assert.equal(isPin('123456'), true)
    assert.equal(isPin('12345'), false)
    assert.equal(isPin('1234567'), false)
    assert.equal(isPin('12a456'), false)
  })
})
