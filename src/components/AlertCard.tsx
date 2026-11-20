import { Link } from 'react-router-dom'
import {
  formatEt,
  formatRelative,
  incidentHeadline,
  placeLine,
  previewLine,
  priorityMeta,
  sourceLabel,
} from '../lib/alerts'
import { alertQueryPath, alertShortCode } from '../lib/shortId'
import { useAlerts } from '../state/alerts'
import type { Alert } from '../types'

export function AlertCard({ alert, now, from }: { alert: Alert; now: number; from: 'feed' | 'map' }) {
  const { freshIds } = useAlerts()
  const tone = priorityMeta(alert.priority)
  const fresh = freshIds.has(alert.id)
  const place = placeLine(alert)
  const preview = previewLine(alert)
  const when = alert.event_time
  const eyebrow = alert.source_name?.trim() || alert.category || 'Alert'

  return (
    <Link
      className={fresh ? `card tone-${tone.tone} is-fresh` : `card tone-${tone.tone}`}
      to={alertQueryPath(alertShortCode(alert.id))}
      state={{ from }}
    >
      <span className="card-top">
        <span className="card-kicker">
          <span className={`incident-dot tone-${tone.tone}`} aria-hidden="true" />
          <span>{eyebrow}</span>
        </span>
        <span className="card-time">
          <span>{formatRelative(when, now)}</span>
          <span>{formatEt(when, now)}</span>
        </span>
      </span>
      <span className="card-title">{incidentHeadline(alert)}</span>
      {place && <span className="card-place">{place}</span>}
      {alert.address && alert.address !== preview && <span className="card-address">{alert.address}</span>}
      {preview && preview !== alert.address && <span className="card-preview">{preview}</span>}
      <span className="pills">
        <span className={`pill ${tone.tone}`}>{tone.label}</span>
        <span className={`pill ${alert.source_type}`}>{sourceLabel(alert.source_type)}</span>
        {alert.is_update && <span className="pill">Update</span>}
        {alert.is_merged && <span className="pill">Merged</span>}
        {alert.escalations.length > 0 && <span className="pill">Escalated</span>}
        {alert.clip_path && <span className="pill">Clip</span>}
      </span>
    </Link>
  )
}
