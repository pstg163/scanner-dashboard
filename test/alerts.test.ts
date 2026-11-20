import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  applyClientFilters,
  appleMapsUrl,
  displayTown,
  formatEtLong,
  formatIncidentStamp,
  formatRelative,
  formatStoredTime,
  incidentInfoRows,
  mergeAlerts,
  nextPollCursor,
  listenLiveUrl,
  locationSearchQuery,
  mapUrl,
  priorityMeta,
} from '../src/lib/alerts.ts'
import { readAlertExtras } from '../src/lib/alertExtras.ts'
import { alertMatchesCode, alertQueryPath, alertShortCode, deepLinkId, isShortAlertCode } from '../src/lib/shortId.ts'
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

describe('formatters', () => {
  it('formats a recent time', () => {
    const now = Date.parse('2026-11-17T16:00:00.000Z')
    assert.equal(formatRelative('2026-11-17T15:54:00.000Z', now), '6m ago')
  })

  it('labels priorities', () => {
    assert.equal(priorityMeta(5).tone, 'urgent')
    assert.equal(priorityMeta(4).label, 'Serious')
    assert.equal(priorityMeta(2).tone, 'quiet')
  })

})

describe('listenLiveUrl', () => {
  it('uses an explicit listen_url', () => {
    const alert = row({
      id: 'cad-1',
      event_time: '2026-11-17T20:00:00.000Z',
      source_type: 'cad',
      listen_url: 'https://www.broadcastify.com/listen/feed/45172',
    })
    assert.equal(listenLiveUrl(alert), 'https://www.broadcastify.com/listen/feed/45172')
  })

  it('uses a Broadcastify playlist listen_url without a feed id', () => {
    const url = 'https://www.broadcastify.com/calls/playlists/?uuid=3b04607c-c069-11f0-bb32-0ef97433b5f9'
    const alert = row({
      id: 'rss-police',
      event_time: '2026-11-17T20:00:00.000Z',
      source_type: 'rss',
      source_feed_id: null,
      listen_url: url,
    })
    assert.equal(listenLiveUrl(alert), url)
  })

  it('builds a listen link from source_feed_id on CAD and RSS alerts', () => {
    const cad = row({
      id: 'cad-2',
      event_time: '2026-11-17T20:00:00.000Z',
      source_type: 'cad',
      source_feed_id: '41110',
    })
    assert.equal(listenLiveUrl(cad), 'https://www.broadcastify.com/listen/feed/41110')
    const rss = row({
      id: 'rss-1',
      event_time: '2026-11-17T20:00:00.000Z',
      source_type: 'rss',
      source_feed_id: '12174',
    })
    assert.equal(listenLiveUrl(rss), 'https://www.broadcastify.com/listen/feed/12174')
  })

  it('does not invent a second listen link for radio alerts', () => {
    const alert = row({
      id: 'radio-1',
      event_time: '2026-11-17T20:00:00.000Z',
      source_type: 'radio',
      source_feed_id: '43015',
      source_url: 'https://www.broadcastify.com/listen/feed/43015',
    })
    assert.equal(listenLiveUrl(alert), null)
  })
})

describe('mapUrl', () => {
  it('uses an explicit map field first', () => {
    const alert = row({
      id: 'cad-map',
      event_time: '2026-11-19T19:01:36.000Z',
      source_type: 'cad',
      address: 'RIDGE RD',
      town: 'TFB',
      county: 'Onondaga',
      map: 'https://maps.google.com/?q=RIDGE+RD,Onondaga+County,+NY',
    })
    assert.equal(alert.map && mapUrl(alert), alert.map)
  })

  it('uses coordinates when present', () => {
    const alert = row({
      id: 'monroe-fire',
      event_time: '2026-11-19T19:01:34.000Z',
      source_type: 'rss',
      address: '250 MILE CROSSING BLVD (WESTSIDE EYE CARE)',
      town: 'Gates',
      county: 'Monroe',
      lat: 43.1503,
      lng: -77.7275,
    })
    assert.equal(mapUrl(alert), 'https://maps.google.com/?q=43.1503,-77.7275')
  })

  it('builds a search URL for Onondaga alerts without coordinates', () => {
    const alert = row({
      id: '1795114896079-d7362424',
      event_time: '2026-11-19T19:01:36.000Z',
      source_type: 'cad',
      address: 'RIDGE RD',
      town: 'TFB',
      county: 'Onondaga',
      lat: null,
      lng: null,
    })
    const url = mapUrl(alert)
    assert.ok(url)
    assert.match(url!, /maps\.google\.com/)
    const decoded = decodeURIComponent(url!)
    assert.match(decoded, /RIDGE RD/)
    assert.match(decoded, /Town of Fabius/)
    assert.match(decoded, /Onondaga County, NY/)
  })

  it('builds an Apple Maps pin from coordinates and a search without them', () => {
    const located = row({
      id: 'pin',
      event_time: '2026-11-19T19:01:34.000Z',
      address: '250 Mile Crossing Blvd',
      town: 'Gates',
      county: 'Monroe',
      lat: 43.1503,
      lng: -77.7275,
    })
    assert.match(appleMapsUrl(located)!, /maps\.apple\.com\/\?ll=43\.1503,-77\.7275/)
    const search = row({
      id: 'search',
      event_time: '2026-11-19T19:01:36.000Z',
      address: 'RIDGE RD',
      town: 'TFB',
      county: 'Onondaga',
    })
    const url = appleMapsUrl(search)
    assert.ok(url)
    assert.match(decodeURIComponent(url!), /RIDGE RD, Town of Fabius, Onondaga County, NY/)
    assert.equal(locationSearchQuery(search), 'RIDGE RD, Town of Fabius, Onondaga County, NY')
  })

  it('maps known iCAD codes and leaves unknown codes uppercase', () => {
    assert.equal(displayTown('TFB'), 'Town of Fabius')
    assert.equal(displayTown('Tfb'), 'Town of Fabius')
    assert.equal(displayTown('TZZ'), 'TZZ')
    assert.equal(displayTown('Syracuse'), 'Syracuse')
  })
})

describe('incident detail fields', () => {
  it('formats an Eastern timestamp with the incident prefix', () => {
    assert.equal(formatIncidentStamp('2026-11-20T02:29:00.000Z'), 'Incident Nov 19, 2026 9:29 PM EST')
    assert.equal(formatEtLong('2026-11-20T02:29:00.000Z'), 'Nov 19, 2026 9:29 PM EST')
    assert.equal(formatStoredTime('2026-11-19 17:46:31 EST'), 'Nov 19, 2026 5:46 PM EST')
    assert.equal(
      formatStoredTime('11/19/26 20:48', '2026-11-20T02:20:48.000Z'),
      'Nov 19, 2026 9:20 PM EST',
    )
  })

  it('omits empty incident rows and keeps cross streets when present', () => {
    const full = row({
      id: 'cad',
      event_time: '2026-11-20T02:20:48.000Z',
      address: 'E RAYNOR AVE',
      town: 'Syracuse',
      county: 'Onondaga',
      place: '108 BLDG',
      cross_streets: 'S SALINA ST & MONTGOMERY ST',
      agency: 'Syracuse Police',
      source_name: 'Onondaga 911 iCAD',
      status: 'ENROUTE',
      clip_path: null,
    })
    const labels = incidentInfoRows(full).map((item) => item.label)
    assert.deepEqual(labels, ['Address', 'Cross streets', 'Township / City', 'County', 'Agency / Source', 'Status', 'Dispatch time'])
    assert.equal(incidentInfoRows(full)[0]?.value, 'E RAYNOR AVE (108 BLDG)')
    assert.match(incidentInfoRows(full).find((item) => item.label === 'Agency / Source')!.value, /Syracuse Police/)

    const sparse = row({
      id: 'sparse',
      event_time: 'not-a-date',
      address: null,
      town: null,
      county: null,
      source_name: null,
    })
    assert.deepEqual(incidentInfoRows(sparse), [])
  })

  it('reads display fields from the row or from raw', () => {
    const extras = readAlertExtras({
      listen_url: ' https://www.broadcastify.com/listen/feed/1 ',
      raw: {
        map: 'https://maps.google.com/?q=1',
        cross_streets: 'MAIN ST & ELM ST',
        agency: 'Victor Fire',
        place: '',
        incident_id: 'ONT-1',
      },
    })
    assert.equal(extras.listen_url, 'https://www.broadcastify.com/listen/feed/1')
    assert.equal(extras.cross_streets, 'MAIN ST & ELM ST')
    assert.equal(extras.agency, 'Victor Fire')
    assert.equal(extras.place, null)
    assert.equal(extras.incident_id, 'ONT-1')
    assert.equal(extras.map, 'https://maps.google.com/?q=1')
  })
})

describe('short alert codes', () => {
  it('uses the 8-character suffix from a standard alert id', () => {
    assert.equal(alertShortCode('1794945386471-12a33337'), '12a33337')
    assert.equal(isShortAlertCode('12a33337'), true)
    assert.equal(isShortAlertCode('1794945386471-12a33337'), false)
    assert.equal(alertMatchesCode('1794945386471-12a33337', '12a33337'), true)
    assert.equal(alertMatchesCode('1794945386471-12a33337', '1794945386471-12a33337'), true)
    assert.equal(alertMatchesCode('1794945386471-12a33337', 'deadbeef'), false)
  })

  it('reads HTTP 200 query and hash deep links', () => {
    assert.equal(alertQueryPath('12a33337'), '/?a=12a33337')
    assert.equal(deepLinkId('?a=12a33337'), '12a33337')
    assert.equal(deepLinkId('?alert=1794945386471-12a33337'), '1794945386471-12a33337')
    assert.equal(deepLinkId('', '#/a/12a33337'), '12a33337')
    assert.equal(deepLinkId('', '#/alert/1794945386471-12a33337'), '1794945386471-12a33337')
    assert.equal(deepLinkId(''), null)
  })
})
