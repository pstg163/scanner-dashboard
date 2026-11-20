import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { geocodeQuery, inNewYork, parseNominatimBody, parsePhotonBody } from '../src/lib/geocode.ts'
import type { Alert } from '../src/types.ts'

function row(partial: Partial<Alert> & Pick<Alert, 'id'>): Alert {
  return {
    created_at: '2026-11-20T02:00:00.000Z',
    updated_at: '2026-11-20T02:00:00.000Z',
    event_time: '2026-11-20T02:00:00.000Z',
    event_ts: null,
    county: 'Onondaga',
    town: 'TFB',
    address: 'RIDGE RD',
    lat: null,
    lng: null,
    category: 'SHOOTING/SHOTS FIRED',
    priority: 5,
    title: 'shots',
    summary: null,
    transcript: null,
    snippet: null,
    source_type: 'cad',
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

describe('geocode helpers', () => {
  it('builds a New York search from address, town, and county', () => {
    assert.equal(geocodeQuery(row({ id: 'a' })), 'RIDGE RD, Town of Fabius, Onondaga County, NY')
    assert.equal(geocodeQuery(row({ id: 'b', address: null, town: null, county: null })), null)
  })

  it('keeps New York hits and drops points outside the state', () => {
    assert.equal(inNewYork(43.03, -76.14), true)
    assert.equal(inNewYork(41.88, -87.62), false)
    const photon = parsePhotonBody({
      features: [{ geometry: { coordinates: [-76.14, 43.03] } }],
    })
    assert.deepEqual(photon, { lat: 43.03, lng: -76.14 })
    assert.equal(
      parsePhotonBody({ features: [{ geometry: { coordinates: [-87.62, 41.88] } }] }),
      null,
    )
    assert.deepEqual(parseNominatimBody([{ lat: '43.0358', lon: '-76.1393' }]), {
      lat: 43.0358,
      lng: -76.1393,
    })
    assert.equal(parseNominatimBody([]), null)
  })
})
