import { dashboardHeaders, functionUrl, PAGE_LIMIT } from '../config'
import { readAlertExtras } from '../lib/alertExtras'
import type { Alert, ClipResult, ListParams, ListResult, SourceType } from '../types'

export class DashboardError extends Error {
  readonly code: string
  readonly status: number
  readonly retryAfter: number | null

  constructor(code: string, status: number, retryAfter: number | null = null) {
    super(code)
    this.name = 'DashboardError'
    this.code = code
    this.status = status
    this.retryAfter = retryAfter
  }
}

export function isDashboardError(err: unknown): err is DashboardError {
  return err instanceof DashboardError
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

export function errorMessage(err: unknown): string {
  if (isDashboardError(err)) {
    if (err.status === 401 || err.status === 403) return 'The dashboard did not accept that request.'
    if (err.status === 429) return 'Too many requests. Wait a moment and try again.'
    if (err.code === 'not found') return 'That alert is no longer available.'
    if (err.code === 'no clip') return 'No audio clip for this alert.'
    if (err.status === 503) return 'The dashboard is temporarily unavailable.'
    return "The dashboard couldn't complete that request."
  }
  if (isAbortError(err)) return ''
  if (err instanceof TypeError) return "Can't reach the dashboard. Check your connection."
  return 'Something went wrong.'
}

async function request(params: URLSearchParams, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(`${functionUrl}?${params.toString()}`, {
    method: 'GET',
    headers: dashboardHeaders(),
    cache: 'no-store',
    signal,
  })
  const body = await readBody(response)
  if (!response.ok) throw errorFrom(response, body)
  if (isRecord(body) && body.ok === false) {
    throw new DashboardError('bad response', response.status)
  }
  return body
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text) as unknown
  } catch {
    return {}
  }
}

function errorFrom(response: Response, body: unknown): DashboardError {
  const record = isRecord(body) ? body : {}
  const code = typeof record.error === 'string' ? record.error : 'request failed'
  if (response.status === 401 || response.status === 403 || code === 'unauthorized') {
    return new DashboardError('unauthorized', response.status)
  }
  if (response.status === 429 || code === 'locked') {
    const fromBody = typeof record.retry_after === 'number' ? record.retry_after : Number(record.retry_after)
    const fromHeader = Number(response.headers.get('Retry-After'))
    const retry = Number.isFinite(fromBody) && fromBody > 0 ? fromBody : fromHeader
    return new DashboardError('locked', 429, Number.isFinite(retry) && retry > 0 ? retry : 60)
  }
  return new DashboardError(code, response.status)
}

export async function listAlerts(params: ListParams = {}, signal?: AbortSignal): Promise<ListResult> {
  const query = new URLSearchParams({ action: 'list' })
  const limit = params.limit ?? PAGE_LIMIT
  query.set('limit', String(limit))
  if (params.since) query.set('since', params.since)
  if (params.county) query.set('county', params.county)
  if (params.town) query.set('town', params.town)
  if (params.category) query.set('category', params.category)
  if (params.source_type) query.set('source_type', params.source_type)
  if (params.priority != null) query.set('priority', String(params.priority))
  return parseList(await request(query, signal), limit)
}

export async function getAlert(id: string, signal?: AbortSignal): Promise<Alert> {
  const query = new URLSearchParams({ action: 'get', id })
  const body = await request(query, signal)
  const alert = isRecord(body) ? parseAlert(body.alert) : null
  if (!alert) throw new DashboardError('bad response', 200)
  return alert
}

export async function getClip(id: string, signal?: AbortSignal): Promise<ClipResult> {
  const query = new URLSearchParams({ action: 'clip', id })
  const body = await request(query, signal)
  if (!isRecord(body) || typeof body.signed_url !== 'string') {
    throw new DashboardError('bad response', 200)
  }
  return {
    url: body.signed_url,
    expiresIn: typeof body.expires_in === 'number' ? body.expires_in : 3600,
    clipPath: typeof body.clip_path === 'string' ? body.clip_path : '',
  }
}

function parseList(body: unknown, fallbackLimit: number): ListResult {
  if (!isRecord(body)) throw new DashboardError('bad response', 200)
  const alerts = Array.isArray(body.alerts) ? body.alerts.flatMap((row) => {
    const alert = parseAlert(row)
    return alert ? [alert] : []
  }) : []
  const serverTime = typeof body.server_time === 'string' ? body.server_time : new Date().toISOString()
  const pollAfter = typeof body.poll_after === 'string' && body.poll_after ? body.poll_after : serverTime
  return {
    alerts,
    count: typeof body.count === 'number' ? body.count : alerts.length,
    limit: typeof body.limit === 'number' ? body.limit : fallbackLimit,
    since: typeof body.since === 'string' ? body.since : null,
    serverTime,
    pollAfter,
  }
}

function parseAlert(row: unknown): Alert | null {
  if (!isRecord(row) || typeof row.id !== 'string' || row.id.length === 0) return null
  return {
    id: row.id,
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
    event_time: asString(row.event_time),
    event_ts: asNumber(row.event_ts),
    county: asStringOrNull(row.county),
    town: asStringOrNull(row.town),
    address: asStringOrNull(row.address),
    lat: asNumber(row.lat),
    lng: asNumber(row.lng),
    category: asStringOrNull(row.category),
    priority: asNumber(row.priority),
    title: asStringOrNull(row.title),
    summary: asStringOrNull(row.summary),
    transcript: asStringOrNull(row.transcript),
    snippet: asStringOrNull(row.snippet),
    source_type: asSource(row.source_type),
    source_feed_id: asStringOrNull(row.source_feed_id),
    source_name: asStringOrNull(row.source_name),
    source_url: asStringOrNull(row.source_url),
    ...readAlertExtras(row),
    clip_path: asStringOrNull(row.clip_path),
    dedupe_key: asStringOrNull(row.dedupe_key),
    is_update: row.is_update === true,
    is_merged: row.is_merged === true,
    escalations: Array.isArray(row.escalations)
      ? row.escalations.filter((item): item is string => typeof item === 'string')
      : [],
    tags: asStringOrNull(row.tags),
    geocode_status: asStringOrNull(row.geocode_status),
  }
}

function asSource(value: unknown): SourceType {
  if (value === 'radio' || value === 'rss' || value === 'cad' || value === 'x') return value
  return 'radio'
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
