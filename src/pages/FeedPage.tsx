import { FeedFilters } from '../components/Filters'
import { AlertCard } from '../components/AlertCard'
import { useAlerts } from '../state/alerts'

export function FeedPage() {
  const { alerts, filtered, filters, status, error, now, reload, setFilters } = useAlerts()

  return (
    <div className="feed">
      <FeedFilters />
      {error && (
        <p className="banner" role="alert">
          {error}{' '}
          <button type="button" className="linkish" onClick={reload}>
            Retry
          </button>
        </p>
      )}
      <div className="feed-meta">
        <span>
          {filtered.length} {filtered.length === 1 ? 'alert' : 'alerts'}
        </span>
        <button type="button" className="linkish" onClick={reload}>
          Refresh
        </button>
      </div>
      {status === 'loading' && filtered.length === 0 ? (
        <div className="stack" aria-hidden="true">
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ) : status === 'error' && filtered.length === 0 ? (
        <div className="empty">
          <h1>Alerts didn’t load</h1>
          <p>{error || 'Check the connection and try again.'}</p>
          <button type="button" className="btn" onClick={reload}>
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          {alerts.length === 0 ? (
            <>
              <h1>No alerts yet</h1>
              <p>New calls land here. If a dispatch just went out, refresh.</p>
              <button type="button" className="btn" onClick={reload}>
                Refresh
              </button>
            </>
          ) : (
            <>
              <h1>Nothing in this window</h1>
              <p>
                {filters.q
                  ? `No alerts match “${filters.q}”.`
                  : `No alerts in the last ${filters.range === '1h' ? 'hour' : filters.range === '6h' ? '6 hours' : filters.range === '24h' ? '24 hours' : '7 days'}.`}
              </p>
              <button type="button" className="btn" onClick={() => setFilters({ range: '7d', q: '' })}>
                Show 7 days
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="stack">
          {filtered.map((alert) => (
            <AlertCard key={alert.id} alert={alert} now={now} from="feed" />
          ))}
        </div>
      )}
    </div>
  )
}
