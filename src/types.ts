export type SourceType = 'radio' | 'rss' | 'cad' | 'x'

export type Alert = {
  id: string
  created_at: string
  updated_at: string
  event_time: string
  event_ts: number | null
  county: string | null
  town: string | null
  address: string | null
  lat: number | null
  lng: number | null
  category: string | null
  priority: number | null
  title: string | null
  summary: string | null
  transcript: string | null
  snippet: string | null
  source_type: SourceType
  source_feed_id: string | null
  source_name: string | null
  source_url: string | null
  listen_url?: string | null
  map?: string | null
  cross_streets?: string | null
  agency?: string | null
  place?: string | null
  incident_id?: string | null
  call_type?: string | null
  cad_time?: string | null
  status?: string | null
  transmission_time?: string | null
  correction_note?: string | null
  clip_path: string | null
  dedupe_key: string | null
  is_update: boolean
  is_merged: boolean
  escalations: string[]
  tags: string | null
  geocode_status: string | null
}

export type TimeRange = '1h' | '6h' | '24h' | '7d'

export type FeedFilters = {
  county: string | null
  category: string | null
  priority: number | null
  source: SourceType | null
  range: TimeRange
  q: string
}

export type ListParams = {
  limit?: number
  since?: string | null
  county?: string | null
  town?: string | null
  category?: string | null
  source_type?: SourceType | null
  priority?: number | null
}

export type ListResult = {
  alerts: Alert[]
  count: number
  limit: number
  since: string | null
  serverTime: string
  pollAfter: string
}

export type ClipResult = {
  url: string
  expiresIn: number
  clipPath: string
}

export type DashboardApi = {
  list: (params?: ListParams, signal?: AbortSignal) => Promise<ListResult>
  get: (id: string, signal?: AbortSignal) => Promise<Alert>
  clip: (id: string, signal?: AbortSignal) => Promise<ClipResult>
}
