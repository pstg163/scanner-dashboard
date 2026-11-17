import { AlertMap } from '../components/AlertMap'
import { MapFilterButton } from '../components/Filters'
import { hasGeo } from '../lib/alerts'
import { useAlerts } from '../state/alerts'

export function MapPage() {
  const { filtered, status } = useAlerts()
  const located = filtered.filter(hasGeo)
  const missing = filtered.length - located.length

  return (
    <div className="map-page">
      <div className="map-toolbar">
        <MapFilterButton />
        <p>
          {status === 'loading' && located.length === 0
            ? 'Loading the map…'
            : `${located.length} on the map`}
        </p>
      </div>
      <div className="map-stage">
        <AlertMap alerts={filtered} interactive />
        {filtered.length > 0 && located.length === 0 && status !== 'loading' && (
          <p className="map-empty">None of these alerts have coordinates. They stay in the list.</p>
        )}
      </div>
      {missing > 0 && (
        <p className="map-note">
          {missing} {missing === 1 ? 'alert has' : 'alerts have'} no coordinates and {missing === 1 ? 'stays' : 'stay'} in the list.
        </p>
      )}
    </div>
  )
}
