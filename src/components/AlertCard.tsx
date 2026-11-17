import { Link } from 'react-router-dom'
import { formatEt, formatRelative, placeLine, previewLine, priorityMeta, sourceLabel } from '../lib/alerts'
import { useAlerts } from '../state/alerts'
import type { Alert } from '../types'
import { CategoryMark } from './icons'

export function AlertCard({ alert, now, from }: { alert: Alert; now: number; from: 'feed' | 'map' }) {
  const { freshIds } = useAlerts()
  const tone = priorityMeta(alert.priority)
  const fresh = freshIds.has(alert.id)
  const place = placeLine(alert)
  const preview = previewLine(alert)
  const when = alert.event_time

  return (
    <Link
      className={fresh ? `card tone-${tone.tone} is-fresh` : `card tone-${tone.tone}`}
      to={`/alert/${encodeURIComponent(alert.id)}`}
      state={{ from }}
    >
      <span className="card-bar" aria-hidden="true" />
      <span className="card-body">
        <span className="card-top">
          <CategoryMark category={alert.category} />
          <span className="card-copy">
            <span className="card-kicker">{alert.category || 'Alert'}</span>
            <span className="card-title">{alert.title || 'Untitled alert'}</span>
            {place && <span className="card-place">{place}</span>}
          </span>
          <span className="card-time">
            <span>{formatRelative(when, now)}</span>
            <span>{formatEt(when, now)}</span>
          </span>
        </span>
        {preview && <span className="card-preview">{preview}</span>}
        {alert.address && alert.address !== preview && <span className="card-address">{alert.address}</span>}
        <span className="badges">
          <span className={`badge ${tone.tone}`}>{tone.label}</span>
          <span className={`badge ${alert.source_type}`}>{sourceLabel(alert.source_type)}</span>
          {alert.is_update && <span className="badge">Update</span>}
          {alert.is_merged && <span className="badge">Merged</span>}
          {alert.escalations.length > 0 && <span className="badge">Escalated</span>}
          {alert.clip_path && <span className="badge">Clip</span>}
        </span>
      </span>
    </Link>
  )
}
