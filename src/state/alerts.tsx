import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { getApi } from '../api'
import { errorMessage, isAbortError } from '../api/dashboard'
import {
  MAX_DRAIN_PAGES,
  PAGE_LIMIT,
  POLL_MS,
} from '../config'
import {
  COUNTIES,
  applyClientFilters,
  mergeAlerts,
  nextPollCursor,
} from '../lib/alerts'
import { signalNewAlerts, unseenAlerts } from '../lib/chime'
import type { Alert, FeedFilters, ListParams } from '../types'

const DEFAULT_FILTERS: FeedFilters = {
  county: null,
  category: null,
  priority: null,
  source: null,
  range: '24h',
  q: '',
}

type AlertsValue = {
  alerts: Alert[]
  filtered: Alert[]
  filters: FeedFilters
  setFilters: (patch: Partial<FeedFilters>) => void
  clearFilters: () => void
  categories: string[]
  counties: string[]
  status: 'loading' | 'ready' | 'error'
  refreshing: boolean
  error: string | null
  lastSync: number | null
  now: number
  reload: () => void
  freshIds: ReadonlySet<string>
}

const AlertsContext = createContext<AlertsValue | null>(null)

export function AlertsProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [filters, setFiltersState] = useState<FeedFilters>(DEFAULT_FILTERS)
  const [categories, setCategories] = useState<string[]>([])
  const [extraCounties, setExtraCounties] = useState<string[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [reloadToken, setReloadToken] = useState(0)
  const [freshIds, setFreshIds] = useState<ReadonlySet<string>>(() => new Set())
  const pollAfterRef = useRef<string | null>(null)
  const hasDataRef = useRef(false)
  const knownIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    let stopped = false
    let inflight = false
    const server: Pick<ListParams, 'county' | 'category' | 'source_type' | 'priority'> = {
      county: filters.county,
      category: filters.category,
      source_type: filters.source,
      priority: filters.priority,
    }

    function remember(rows: Alert[]) {
      setCategories((prev) => {
        const next = new Set(prev)
        let changed = false
        for (const row of rows) {
          if (row.category && !next.has(row.category)) {
            next.add(row.category)
            changed = true
          }
        }
        return changed ? [...next].sort((a, b) => a.localeCompare(b)) : prev
      })
      setExtraCounties((prev) => {
        const known = new Set<string>(COUNTIES)
        const next = new Set(prev)
        let changed = false
        for (const row of rows) {
          if (row.county && !known.has(row.county) && !next.has(row.county)) {
            next.add(row.county)
            changed = true
          }
        }
        return changed ? [...next].sort((a, b) => a.localeCompare(b)) : prev
      })
    }

    function apply(rows: Alert[], mode: 'replace' | 'merge', announce: boolean) {
      const fresh = announce ? unseenAlerts(knownIdsRef.current, rows) : []
      if (mode === 'replace') knownIdsRef.current = new Set(rows.map((row) => row.id))
      else for (const row of rows) knownIdsRef.current.add(row.id)
      if (fresh.length > 0) {
        const ids = fresh.map((row) => row.id)
        setFreshIds((current) => new Set([...current, ...ids]))
        window.setTimeout(() => {
          setFreshIds((current) => {
            const next = new Set(current)
            for (const id of ids) next.delete(id)
            return next
          })
        }, 1600)
        signalNewAlerts(fresh)
      }
      setAlerts((prev) => {
        const next = mergeAlerts(prev, rows, mode)
        hasDataRef.current = next.length > 0
        return next
      })
      remember(rows)
      setLastSync(Date.now())
    }

    async function drain(since: string | null, mode: 'replace' | 'merge', announce: boolean) {
      if (inflight) return
      inflight = true
      try {
        const api = await getApi()
        let cursor = since
        let pageMode = mode
        for (let page = 0; page < MAX_DRAIN_PAGES; page += 1) {
          const result = await api.list(
            { limit: PAGE_LIMIT, since: cursor, ...server },
            controller.signal,
          )
          if (stopped) return
          apply(result.alerts, pageMode, announce && pageMode === 'merge')
          const step = nextPollCursor(
            { count: result.count, limit: result.limit, pollAfter: result.pollAfter },
            cursor,
          )
          if (!step.drain) {
            pollAfterRef.current = step.cursor
            return
          }
          cursor = step.cursor
          pageMode = 'merge'
        }
      } finally {
        inflight = false
      }
    }

    function fail(err: unknown) {
      if (stopped || isAbortError(err)) return
      setError(errorMessage(err))
      setStatus(hasDataRef.current ? 'ready' : 'error')
    }

    async function loadInitial() {
      setAlerts([])
      hasDataRef.current = false
      setStatus('loading')
      setError(null)
      pollAfterRef.current = null
      try {
        await drain(null, 'replace', false)
        if (!stopped) setStatus('ready')
      } catch (err) {
        fail(err)
      }
    }

    async function poll() {
      // Keep polling in background tabs so new alerts still chime while you're in another tab.
      if (stopped) return
      if (!pollAfterRef.current) return
      setRefreshing(true)
      try {
        await drain(pollAfterRef.current, 'merge', true)
      } catch (err) {
        fail(err)
      } finally {
        if (!stopped) setRefreshing(false)
      }
    }

    void loadInitial()
    const interval = window.setInterval(() => {
      void poll()
    }, POLL_MS)

    function onVisible() {
      if (!document.hidden) void poll()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      stopped = true
      controller.abort()
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [
    filters.county,
    filters.category,
    filters.priority,
    filters.source,
    reloadToken,
  ])

  const setFilters = useCallback((patch: Partial<FeedFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }))
  }, [])

  const clearFilters = useCallback(() => setFiltersState(DEFAULT_FILTERS), [])

  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

  const filtered = useMemo(
    () => applyClientFilters(alerts, { q: filters.q, range: filters.range }, now),
    [alerts, filters.q, filters.range, now],
  )

  const counties = useMemo(() => [...COUNTIES, ...extraCounties], [extraCounties])

  const value = useMemo<AlertsValue>(
    () => ({
      alerts,
      filtered,
      filters,
      setFilters,
      clearFilters,
      categories,
      counties,
      status,
      refreshing,
      error,
      lastSync,
      now,
      reload,
      freshIds,
    }),
    [
      alerts,
      filtered,
      filters,
      setFilters,
      clearFilters,
      categories,
      counties,
      status,
      refreshing,
      error,
      lastSync,
      now,
      reload,
      freshIds,
    ],
  )

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>
}

export function useAlerts(): AlertsValue {
  const value = useContext(AlertsContext)
  if (!value) throw new Error('useAlerts must be used within AlertsProvider')
  return value
}
