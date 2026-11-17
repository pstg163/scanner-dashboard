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

export function placeLine(alert: Alert): string {
  return [alert.town, alert.county].filter(Boolean).join(', ')
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

/** Broadcastify listen page for CAD/RSS alerts (or an explicit listen_url). */
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
