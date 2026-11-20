import type { Alert, SourceType, TimeRange } from '../types.ts'

export const COUNTIES = [
  'Ontario',
  'Seneca',
  'Wayne',
  'Yates',
  'Monroe',
  'Cayuga',
  'Onondaga',
] as const

export const RANGE_MS: Record<TimeRange, number> = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
}

export const RANGE_LABEL: Record<TimeRange, string> = {
  '1h': '1h',
  '6h': '6h',
  '24h': '24h',
  '7d': '7d',
}

const ALERT_CAP = 500

export function mergeAlerts(existing: Alert[], incoming: Alert[], mode: 'replace' | 'merge'): Alert[] {
  const base = mode === 'replace' ? [] : existing
  const byId = new Map<string, Alert>()
  for (const alert of base) byId.set(alert.id, alert)
  for (const alert of incoming) byId.set(alert.id, alert)
  const merged = [...byId.values()]
  merged.sort((a, b) => {
    const delta = Date.parse(b.event_time) - Date.parse(a.event_time)
    if (delta !== 0 && Number.isFinite(delta)) return delta
    if (a.id === b.id) return 0
    return a.id < b.id ? 1 : -1
  })
  return merged.slice(0, ALERT_CAP)
}

export function nextPollCursor(
  page: { count: number; limit: number; pollAfter: string },
  requestedSince: string | null,
): { drain: boolean; cursor: string } {
  const advanced = page.pollAfter.length > 0 && page.pollAfter !== requestedSince
  if (page.limit > 0 && page.count === page.limit && advanced) {
    return { drain: true, cursor: page.pollAfter }
  }
  return { drain: false, cursor: page.pollAfter }
}

export function applyClientFilters(
  alerts: Alert[],
  filters: { q: string; range: TimeRange },
  now = Date.now(),
): Alert[] {
  const q = filters.q.trim().toLowerCase()
  const cutoff = now - RANGE_MS[filters.range]
  return alerts.filter((alert) => {
    const when = Date.parse(alert.event_time)
    if (Number.isFinite(when) && when < cutoff) return false
    if (!q) return true
    return haystack(alert).includes(q)
  })
}

function haystack(alert: Alert): string {
  return [
    alert.title,
    alert.summary,
    alert.transcript,
    alert.snippet,
    alert.address,
    alert.town,
    alert.county,
    alert.category,
    alert.source_name,
    alert.tags,
  ]
    .filter((part): part is string => Boolean(part))
    .join('\n')
    .toLowerCase()
}

export function hasGeo(alert: Alert): alert is Alert & { lat: number; lng: number } {
  return (
    typeof alert.lat === 'number' &&
    typeof alert.lng === 'number' &&
    Number.isFinite(alert.lat) &&
    Number.isFinite(alert.lng)
  )
}

export type PriorityTone = 'urgent' | 'serious' | 'quiet' | 'other'

export function priorityMeta(priority: number | null): { label: string; tone: PriorityTone } {
  if (priority === 5) return { label: 'Urgent', tone: 'urgent' }
  if (priority === 4) return { label: 'Serious', tone: 'serious' }
  if (priority === 2) return { label: 'Minor', tone: 'quiet' }
  if (priority == null) return { label: 'Unset', tone: 'other' }
  return { label: `P${priority}`, tone: 'other' }
}

export function priorityColor(priority: number | null): string {
  if (priority === 5) return '#ff3b30'
  if (priority === 4) return '#ff8a1f'
  if (priority === 2) return '#8b98ab'
  return '#c5d0dc'
}

// Onondaga iCAD municipality codes (same mapping as the monitor).
const ONONDAGA_MUN: Record<string, string> = {
  SYR: 'Syracuse',
  TSL: 'Salina',
  TCM: 'Camillus',
  TDW: 'DeWitt',
  TMA: 'Manlius',
  TCI: 'Cicero',
  TCL: 'Clay',
  TLY: 'Lysander',
  TVB: 'Van Buren',
  TON: 'Onondaga',
  TPO: 'Pompey',
  TSK: 'Skaneateles',
  TEL: 'Elbridge',
  TMR: 'Marcellus',
  TOT: 'Otisco',
  TSP: 'Spafford',
  TTU: 'Tully',
  TLA: 'LaFayette',
  TFB: 'Town of Fabius',
  TFA: 'Town of Fabius',
  TGD: 'Geddes',
  TGE: 'Geddes',
  VMR: 'Marcellus (V)',
  VLI: 'Liverpool',
  VSK: 'Skaneateles (V)',
  VMA: 'Manlius (V)',
  VFA: 'Fayetteville',
  VNS: 'North Syracuse',
  VES: 'East Syracuse',
  VCA: 'Camillus (V)',
  VMI: 'Minoa',
  VTU: 'Tully (V)',
  VSV: 'Solvay',
  VSO: 'Solvay',
  VBV: 'Baldwinsville',
  VBA: 'Baldwinsville',
  VJR: 'Jordan',
  VJO: 'Jordan',
  VEB: 'Elbridge (V)',
  VEL: 'Elbridge (V)',
}

const MUN_CODE = /^(SYR|[TV][A-Za-z]{2})$/i

export function displayTown(town: string | null | undefined): string {
  const raw = (town ?? '').trim()
  if (!raw) return ''
  if (MUN_CODE.test(raw)) {
    return ONONDAGA_MUN[raw.toUpperCase()] ?? raw.toUpperCase()
  }
  return raw
}

export function placeLine(alert: Alert): string {
  return [displayTown(alert.town) || alert.town, alert.county].filter(Boolean).join(', ')
}

export function previewLine(alert: Alert): string {
  const text = alert.snippet || alert.summary || alert.address || ''
  return text.replace(/\s+/g, ' ').trim()
}

export function sourceLabel(source: SourceType): string {
  switch (source) {
    case 'radio':
      return 'Radio'
    case 'rss':
      return 'RSS'
    case 'cad':
      return 'CAD'
    case 'x':
      return 'X'
  }
}

export function sourceButtonLabel(alert: Alert): string {
  const name = alert.source_name?.trim()
  if (name) return `Open ${name}`
  switch (alert.source_type) {
    case 'radio':
      return 'Open radio feed'
    case 'rss':
      return 'Open RSS source'
    case 'cad':
      return 'Open CAD'
    case 'x':
      return 'Open X post'
  }
}

/** Address + town + county search string, or null when there is nothing to look up. */
export function locationSearchQuery(alert: Alert): string | null {
  const parts: string[] = []
  const address = alert.address?.trim()
  const town = displayTown(alert.town)
  const county = alert.county?.trim()
  if (address) parts.push(address)
  if (town && !parts.join(' ').toLowerCase().includes(town.toLowerCase())) parts.push(town)
  if (!parts.length && !county) return null
  if (county) parts.push(`${county} County, NY`)
  else parts.push('NY')
  return parts.join(', ')
}

/** Google Maps link: stored `map`, coordinates, or a search from address + town + county. */
export function mapUrl(alert: Alert): string | null {
  const explicit = alert.map?.trim()
  if (explicit) return explicit
  if (hasGeo(alert)) return `https://maps.google.com/?q=${alert.lat},${alert.lng}`
  const query = locationSearchQuery(alert)
  if (!query) return null
  return `https://maps.google.com/?q=${encodeURIComponent(query)}`
}

/** Apple Maps link for the same place: a pin when coordinates exist, otherwise a search. */
export function appleMapsUrl(alert: Alert): string | null {
  const label = [alert.address?.trim(), displayTown(alert.town), alert.county?.trim()].filter(Boolean).join(', ')
  if (hasGeo(alert)) {
    return `https://maps.apple.com/?ll=${alert.lat},${alert.lng}&q=${encodeURIComponent(label || 'Incident')}`
  }
  const query = locationSearchQuery(alert)
  if (!query) return null
  return `https://maps.apple.com/?q=${encodeURIComponent(query)}`
}

export function incidentEyebrow(alert: Alert): string {
  const source = alert.source_name?.trim()
  if (source) return source
  const county = alert.county?.trim()
  if (county) return `${county} County Dispatch`
  return 'Scanner dispatch'
}

export function incidentHeadline(alert: Alert): string {
  const call = alert.call_type?.trim()
  if (call) return call
  const category = alert.category?.trim()
  if (category) return category
  return alert.title?.trim() || 'Alert'
}

export function incidentCallout(alert: Alert): string {
  return alert.summary?.trim() || alert.snippet?.trim() || ''
}

export function incidentAddress(alert: Alert): string {
  const address = alert.address?.trim() || ''
  const place = alert.place?.trim() || ''
  if (address && place && !address.toLowerCase().includes(place.toLowerCase())) {
    return `${address} (${place})`
  }
  return address || place
}

export function agencyLine(alert: Alert): string {
  const agency = alert.agency?.trim() || ''
  const source = alert.source_name?.trim() || ''
  if (agency && source && agency.toLowerCase() !== source.toLowerCase()) return `${agency} · ${source}`
  return agency || source
}

export type InfoRow = { label: string; value: string }

export function incidentInfoRows(alert: Alert): InfoRow[] {
  const rows: InfoRow[] = []
  const address = incidentAddress(alert)
  if (address) rows.push({ label: 'Address', value: address })
  const cross = alert.cross_streets?.trim()
  if (cross) rows.push({ label: 'Cross streets', value: cross })
  const town = displayTown(alert.town)
  if (town) rows.push({ label: 'Township / City', value: town })
  const county = alert.county?.trim()
  if (county) rows.push({ label: 'County', value: county })
  const agency = agencyLine(alert)
  if (agency) rows.push({ label: 'Agency / Source', value: agency })
  const status = alert.status?.trim()
  if (status) rows.push({ label: 'Status', value: status })
  const dispatch = formatStoredTime(alert.cad_time, alert.event_time) || formatEtLong(alert.event_time)
  if (alert.clip_path) {
    const attached = formatStoredTime(alert.transmission_time, alert.event_time) || dispatch
    if (attached) rows.push({ label: 'Audio attached', value: attached })
  } else if (dispatch) {
    rows.push({ label: 'Dispatch time', value: dispatch })
  }
  return rows
}

export function updateText(alert: Alert): string {
  return alert.transcript?.trim() || alert.summary?.trim() || alert.snippet?.trim() || ''
}

export function listenLiveUrl(alert: Alert): string | null {
  const explicit = alert.listen_url?.trim()
  if (explicit) return explicit
  if (alert.source_type === 'radio') return null
  const id = alert.source_feed_id?.trim()
  if (id && /^\d+$/.test(id)) return `https://www.broadcastify.com/listen/feed/${id}`
  return null
}

export function formatRelative(iso: string, now = Date.now()): string {
  const when = Date.parse(iso)
  if (!Number.isFinite(when)) return ''
  const seconds = Math.round((now - when) / 1000)
  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

export function formatEt(iso: string, now = Date.now()): string {
  const when = Date.parse(iso)
  if (!Number.isFinite(when)) return ''
  const date = new Date(when)
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
  const clock = `${time} ET`
  const dayKey = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  if (dayKey.format(date) === dayKey.format(new Date(now))) return clock
  const day = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
  }).format(date)
  return `${day}, ${clock}`
}

/** "Nov 19, 2026 9:29 PM EST" in America/New_York. */
export function formatEtLong(iso: string): string {
  const when = Date.parse(iso)
  if (!Number.isFinite(when)) return ''
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).formatToParts(new Date(when))
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  const month = get('month')
  const day = get('day')
  const year = get('year')
  const hour = get('hour')
  const minute = get('minute')
  const period = get('dayPeriod')
  const zone = get('timeZoneName')
  if (!month || !day || !year || !hour || !minute) return ''
  return `${month} ${day}, ${year} ${hour}:${minute} ${period} ${zone}`.trim()
}

export function formatIncidentStamp(iso: string): string {
  const stamp = formatEtLong(iso)
  return stamp ? `Incident ${stamp}` : ''
}

function parseKnownStamp(value: string): number | null {
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  const match = value.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\s*(EST|EDT))?$/i)
  if (!match) return null
  const zone = match[3]?.toUpperCase() === 'EDT' ? '-04:00' : '-05:00'
  const parsed = Date.parse(`${match[1]}T${match[2]}${zone}`)
  return Number.isFinite(parsed) ? parsed : null
}

/** Format an ISO time, or a "YYYY-MM-DD HH:mm:ss EST/EDT" stamp, in Eastern time. */
export function formatStoredTime(value: string | null | undefined, fallbackIso = ''): string {
  const raw = value?.trim()
  if (raw) {
    const parsed = parseKnownStamp(raw)
    if (parsed != null) return formatEtLong(new Date(parsed).toISOString())
  }
  return fallbackIso ? formatEtLong(fallbackIso) : ''
}

export function formatRemain(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function relatedAlerts(alerts: Alert[], alert: Alert): Alert[] {
  const key = alert.dedupe_key
  const rows = key ? alerts.filter((item) => item.dedupe_key === key) : alerts.filter((item) => item.id === alert.id)
  if (!rows.some((item) => item.id === alert.id)) rows.push(alert)
  rows.sort((a, b) => Date.parse(a.event_time) - Date.parse(b.event_time))
  return rows
}
