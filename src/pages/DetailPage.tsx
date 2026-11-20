import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getApi } from '../api'
import { errorMessage, isAbortError, isDashboardError } from '../api/dashboard'
import { BrandCard } from '../components/BrandCard'
import { ClipPlayer } from '../components/ClipPlayer'
import { IncidentMap } from '../components/IncidentMap'
import {
  appleMapsUrl,
  formatEtLong,
  formatIncidentStamp,
  incidentCallout,
  incidentEyebrow,
  incidentHeadline,
  incidentInfoRows,
  listenLiveUrl,
  mapUrl,
  priorityMeta,
  relatedAlerts,
  sourceButtonLabel,
  updateText,
} from '../lib/alerts'
import { alertMatchesCode, alertQueryPath, alertShortCode, deepLinkId } from '../lib/shortId'
import { useAlerts } from '../state/alerts'
import type { Alert } from '../types'

export function DetailPage() {
  const params = useParams()
  const [search] = useSearchParams()
  const location = useLocation()
  const id =
    deepLinkId(`?${search.toString()}`, typeof window === 'undefined' ? '' : window.location.hash) ||
    params.id ||
    ''
  const navigate = useNavigate()
  const { alerts } = useAlerts()
  const alertsRef = useRef(alerts)
  useEffect(() => {
    alertsRef.current = alerts
  }, [alerts])
  const [alert, setAlert] = useState<Alert | null>(null)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    const known = alertsRef.current.find((item) => alertMatchesCode(item.id, id)) ?? null
    setAlert(known)
    setPhase(known ? 'ready' : 'loading')
    setMessage(null)
    const controller = new AbortController()
    void (async () => {
      try {
        const api = await getApi()
        const next = await api.get(id, controller.signal)
        if (controller.signal.aborted) return
        setAlert(next)
        setPhase('ready')
        setMessage(null)
      } catch (err) {
        if (controller.signal.aborted || isAbortError(err)) return
        if (isDashboardError(err) && err.status === 404) {
          setPhase('missing')
          return
        }
        setMessage(errorMessage(err))
        setPhase((current) => (current === 'ready' ? 'ready' : 'error'))
      }
    })()
    return () => controller.abort()
  }, [id])

  useEffect(() => {
    if (phase !== 'ready' || !alert?.id) return
    const code = alertShortCode(alert.id)
    if (!code) return
    const current = deepLinkId(`?${search.toString()}`, window.location.hash)
    if (current && (current === code || current === alert.id || alertMatchesCode(alert.id, current))) return
    // Path-based /a/ and /alert/ links 404 on GitHub Pages. Move to the 200-OK query URL.
    navigate(`/?a=${encodeURIComponent(code)}`, { replace: true })
  }, [phase, alert, search, navigate])

  const headline = alert ? incidentHeadline(alert) : ''

  useEffect(() => {
    document.title = headline ? `${headline} · Scanner Bot` : 'Scanner Bot'
    return () => {
      document.title = 'Scanner Bot'
    }
  }, [headline])

  const from = (location.state as { from?: string } | null)?.from
  const back = from === 'map' ? { to: '/map', label: 'Back to map' } : { to: '/', label: 'All alerts' }
  const backLink = (
    <Link to={back.to} className="brand-link">
      {back.label}
    </Link>
  )

  if (phase === 'loading' && !alert) {
    return (
      <div className="page">
        <BrandCard action={backLink} />
        <div className="detail-grid" aria-hidden="true">
          <div className="skeleton tall" />
          <div className="skeleton" />
        </div>
      </div>
    )
  }

  if (phase === 'missing' || !alert) {
    return (
      <div className="page">
        <BrandCard action={backLink} />
        <div className="panel empty">
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
  const history = [...relatedAlerts(alerts, alert)].reverse()
  const callout = incidentCallout(alert)
  const rows = incidentInfoRows(alert)
  const listen = listenLiveUrl(alert)
  const googleHref = mapUrl(alert)
  const appleHref = appleMapsUrl(alert)
  const stamp = formatIncidentStamp(alert.event_time)
  const idLabel = alert.incident_id?.trim() || alertShortCode(alert.id)
  const showSource =
    Boolean(alert.source_url) && alert.source_url !== listen

  return (
    <article className="page">
      <BrandCard action={backLink} />
      {message && (
        <p className="banner" role="alert">
          {message}
        </p>
      )}
      <div className="detail-grid">
        <section className="panel incident-hero">
          <p className="incident-kicker">
            <span className="incident-dot" aria-hidden="true" />
            <span>{incidentEyebrow(alert)}</span>
          </p>
          <h1>{headline}</h1>
          {callout && <p className="incident-callout">{callout}</p>}
          <div className="pills">
            {idLabel && <span className="pill">{idLabel}</span>}
            {stamp && <span className="pill">{stamp}</span>}
            <span className={`pill ${tone.tone}`}>{tone.label}</span>
          </div>
        </section>

        <section className="panel audio-card">
          <h2>Dispatch Audio</h2>
          <p className="audio-meta">
            <span>{alert.source_name?.trim() || incidentEyebrow(alert)}</span>
            {formatEtLong(alert.event_time) && <span className="audio-when">{` · ${formatEtLong(alert.event_time)}`}</span>}
          </p>
          <ClipPlayer key={alert.id} id={alert.id} clipPath={alert.clip_path} />
          {(listen || showSource) && (
            <div className="stack-btns">
              {listen && (
                <a className="outline-btn" href={listen} target="_blank" rel="noopener noreferrer">
                  Listen live
                </a>
              )}
              {showSource && alert.source_url && (
                <a className="outline-btn" href={alert.source_url} target="_blank" rel="noopener noreferrer">
                  {sourceButtonLabel(alert)}
                </a>
              )}
            </div>
          )}
        </section>

        <section className="panel">
          <h2>Incident Information</h2>
          {rows.length === 0 ? (
            <p className="quiet">No location or dispatch details were stored for this alert.</p>
          ) : (
            <dl className="info-list">
              {rows.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        <section className="panel map-panel">
          <h2>Location Map</h2>
          <IncidentMap key={alert.id} alert={alert} />
          {(appleHref || googleHref) && (
            <div className="stack-btns">
              {appleHref && (
                <a className="outline-btn" href={appleHref} target="_blank" rel="noopener noreferrer">
                  Open in Apple Maps
                </a>
              )}
              {googleHref && (
                <a className="outline-btn" href={googleHref} target="_blank" rel="noopener noreferrer">
                  Open in Google Maps
                </a>
              )}
            </div>
          )}
        </section>

        <section className="panel detail-span">
          <h2>Incident Updates</h2>
          <div className="updates">
            {history.map((item) => {
              const body = updateText(item)
              const current = item.id === alert.id
              const when = formatEtLong(item.event_time)
              return (
                <article key={item.id} className="update">
                  {when && <p className="update-time">Update {when}</p>}
                  {current ? (
                    <p className="update-body">{body || 'No transcript or call notes were stored for this alert.'}</p>
                  ) : (
                    <Link className="update-body update-link" to={alertQueryPath(alertShortCode(item.id))}>
                      {body || item.title || item.category || 'Update'}
                    </Link>
                  )}
                  {current && alert.correction_note?.trim() && (
                    <p className="update-note">Correction: {alert.correction_note.trim()}</p>
                  )}
                  {current && <span className="sr">This alert</span>}
                </article>
              )
            })}
          </div>
          {alert.escalations.length > 0 && (
            <p className="update-note">Escalations: {alert.escalations.join(', ')}</p>
          )}
          {alert.is_merged && (
            <p className="quiet">This report was merged into another call with the same incident.</p>
          )}
          {alert.is_update && <p className="quiet">This alert is an update to an earlier call.</p>}
          {(alert.tags ?? '').trim() && (
            <div className="pills">
              {(alert.tags ?? '')
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean)
                .map((tag) => (
                  <span key={tag} className="pill">
                    {tag.replaceAll('_', ' ')}
                  </span>
                ))}
            </div>
          )}
        </section>
      </div>
    </article>
  )
}
