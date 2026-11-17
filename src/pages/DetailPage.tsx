import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getApi } from '../api'
import { errorMessage, isAbortError, isDashboardError } from '../api/dashboard'
import { AlertMap } from '../components/AlertMap'
import { ClipPlayer } from '../components/ClipPlayer'
import {
  formatEt,
  formatRelative,
  hasGeo,
  placeLine,
  priorityMeta,
  relatedAlerts,
  listenLiveUrl,
  sourceButtonLabel,
  sourceLabel,
} from '../lib/alerts'
import { CategoryMark } from '../components/icons'
import { alertMatchesCode, alertShortCode, deepLinkId } from '../lib/shortId'
import { useAlerts } from '../state/alerts'
import { useSession } from '../state/session'
import type { Alert } from '../types'

export function DetailPage() {
  const params = useParams()
  const [search] = useSearchParams()
  const id =
    deepLinkId(`?${search.toString()}`, typeof window === 'undefined' ? '' : window.location.hash) ||
    params.id ||
    ''
  const navigate = useNavigate()
  const { alerts, now } = useAlerts()
  const { pin, kickout, lockFor } = useSession()
  const alertsRef = useRef(alerts)
  useEffect(() => {
    alertsRef.current = alerts
  }, [alerts])
  const [alert, setAlert] = useState<Alert | null>(null)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!pin || !id) return
    const known = alertsRef.current.find((item) => alertMatchesCode(item.id, id)) ?? null
    setAlert(known)
    setPhase(known ? 'ready' : 'loading')
    setMessage(null)
    const controller = new AbortController()
    void (async () => {
      try {
        const api = await getApi()
        const next = await api.get(pin, id, controller.signal)
        if (controller.signal.aborted) return
        setAlert(next)
        setPhase('ready')
        setMessage(null)
      } catch (err) {
        if (controller.signal.aborted || isAbortError(err)) return
        if (isDashboardError(err) && (err.status === 401 || err.status === 403)) {
          kickout("That PIN wasn't accepted.")
          return
        }
        if (isDashboardError(err) && err.status === 429) {
          lockFor(err.retryAfter ?? 60)
          setMessage('Too many attempts. Wait and open this alert again.')
          setPhase((current) => (current === 'ready' ? 'ready' : 'error'))
          return
        }
        if (isDashboardError(err) && err.status === 404) {
          setPhase('missing')
          return
        }
        setMessage(errorMessage(err))
        setPhase((current) => (current === 'ready' ? 'ready' : 'error'))
      }
    })()
    return () => controller.abort()
  }, [pin, id, kickout, lockFor])

  useEffect(() => {
    if (phase !== 'ready' || !alert?.id) return
    const code = alertShortCode(alert.id)
    if (!code) return
    const current = deepLinkId(`?${search.toString()}`, window.location.hash)
    if (current && (current === code || current === alert.id || alertMatchesCode(alert.id, current))) return
    // Path-based /a/ and /alert/ links 404 on GitHub Pages. Move to the 200-OK query URL.
    navigate(`/?a=${encodeURIComponent(code)}`, { replace: true })
  }, [phase, alert, search, navigate])

  useEffect(() => {
    const title = alert?.title ? `${alert.title} · Scanner Bot` : 'Scanner Bot'
    document.title = title
    return () => {
      document.title = 'Scanner Bot'
    }
  }, [alert?.title])

  if (phase === 'loading' && !alert) {
    return (
      <div className="detail">
        <div className="skeleton tall" />
      </div>
    )
  }

  if (phase === 'missing' || !alert) {
    return (
      <div className="detail">
        <div className="empty">
          <h1>Alert not found</h1>
          <p>The link may be old, or this call was removed.</p>
          <Link to="/" className="btn">
            Back to alerts
          </Link>
        </div>
      </div>
    )
  }

  const tone = priorityMeta(alert.priority)
  const history = relatedAlerts(alerts, alert)
  const body = alert.transcript?.trim() || alert.summary?.trim() || alert.snippet?.trim() || ''
  const summary = alert.summary?.trim()
  const showSummary = Boolean(summary && summary !== body)
  const tags = (alert.tags ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
  const listen = listenLiveUrl(alert)

  return (
    <article className="detail">
      {message && (
        <p className="banner" role="alert">
          {message}
        </p>
      )}
      <header className={`detail-head tone-${tone.tone}`}>
        <div className="detail-kicker">
          <CategoryMark category={alert.category} />
          <span>{alert.category || 'Alert'}</span>
        </div>
        <h1>{alert.title || 'Untitled alert'}</h1>
        <p className="detail-place">{placeLine(alert) || 'County not set'}</p>
        {alert.address && <p className="detail-address">{alert.address}</p>}
        <p className="detail-when">
          <span>{formatRelative(alert.event_time, now)}</span>
          <span>{formatEt(alert.event_time, now)}</span>
        </p>
        <div className="badges">
          <span className={`badge ${tone.tone}`}>{tone.label}</span>
          <span className={`badge ${alert.source_type}`}>{sourceLabel(alert.source_type)}</span>
          {alert.source_name && <span className="badge">{alert.source_name}</span>}
          {alert.is_update && <span className="badge">Update</span>}
          {alert.is_merged && <span className="badge">Merged</span>}
        </div>
      </header>

      {showSummary && (
        <section>
          <h2>Summary</h2>
          <p className="prose">{summary}</p>
        </section>
      )}
      <section>
        <h2>{alert.transcript?.trim() ? 'Transcript' : 'Summary'}</h2>
        <p className="prose">{body || 'No transcript or summary was stored for this alert.'}</p>
      </section>

      <ClipPlayer key={alert.id} id={alert.id} clipPath={alert.clip_path} />

      {(alert.source_url || listen) && (
        <div className="detail-actions">
          {alert.source_url && (
            <a className="btn" href={alert.source_url} target="_blank" rel="noopener noreferrer">
              {sourceButtonLabel(alert)}
            </a>
          )}
          {listen && listen !== alert.source_url && (
            <a className="btn secondary" href={listen} target="_blank" rel="noopener noreferrer">
              Listen live
            </a>
          )}
        </div>
      )}

      <section>
        <h2>Map</h2>
        {hasGeo(alert) ? (
          <div className="detail-map">
            <AlertMap key={alert.id} alerts={[alert]} interactive={false} />
          </div>
        ) : (
          <p className="quiet">No coordinates for this alert. It stays in the list only.</p>
        )}
      </section>

      <section>
        <h2>Escalations</h2>
        {alert.escalations.length === 0 ? (
          <p className="quiet">None recorded.</p>
        ) : (
          <ul className="escalations">
            {alert.escalations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Update history</h2>
        {alert.is_merged && <p className="quiet">This report was merged into another call with the same incident.</p>}
        <ol className="timeline">
          {history.map((item) => {
            const itemTone = priorityMeta(item.priority)
            const current = item.id === alert.id
            return (
              <li key={item.id} className={current ? 'is-current' : ''}>
                <Link to={`/alert/${encodeURIComponent(item.id)}`}>
                  <span className="timeline-time">{formatEt(item.event_time, now)}</span>
                  <span className="timeline-title">{item.title || item.category || 'Update'}</span>
                  <span className={`badge ${itemTone.tone}`}>{itemTone.label}</span>
                  {current && <span className="badge">This alert</span>}
                </Link>
              </li>
            )
          })}
        </ol>
      </section>

      {tags.length > 0 && (
        <section>
          <h2>Tags</h2>
          <div className="badges">
            {tags.map((tag) => (
              <span key={tag} className="badge">
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}
    </article>
  )
}
