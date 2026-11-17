import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { chimeKind, loudest, unseenAlerts } from '../src/lib/chime.ts'
import type { Alert } from '../src/types.ts'

function row(id: string, priority: number): Alert {
  return {
    id,
    created_at: '2026-11-17T12:00:00.000Z',
    updated_at: '2026-11-17T12:00:00.000Z',
    event_time: '2026-11-17T12:00:00.000Z',
    event_ts: null,
    county: 'Monroe',
    town: 'Rochester',
    address: null,
    lat: null,
    lng: null,
    category: 'MEDICAL',
    priority,
    title: id,
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
  }
}

describe('unseenAlerts', () => {
  it('ignores ids already on screen and duplicate rows in the payload', () => {
    const known = new Set(['a'])
    const fresh = unseenAlerts(known, [row('a', 5), row('b', 4), row('b', 4)])
    assert.deepEqual(fresh.map((alert) => alert.id), ['b'])
  })

  it('treats an empty known set as all new', () => {
    const fresh = unseenAlerts(new Set(), [row('a', 2)])
    assert.equal(fresh.length, 1)
  })
})

describe('chimeKind', () => {
  it('uses a triple tone for urgent and a ding for serious', () => {
    assert.equal(chimeKind(5, 'soft'), 'urgent')
    assert.equal(chimeKind(4, 'off'), 'ding')
  })

  it('defaults minor calls to a soft tone and can silence them', () => {
    assert.equal(chimeKind(2, 'soft'), 'soft')
    assert.equal(chimeKind(2, 'off'), 'none')
    assert.equal(chimeKind(null, 'soft'), 'soft')
  })
})

describe('loudest', () => {
  it('picks the highest priority in a batch', () => {
    assert.equal(loudest([row('low', 2), row('high', 5), row('mid', 4)])?.id, 'high')
    assert.equal(loudest([]), null)
  })
})
