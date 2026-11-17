import { useEffect, useMemo } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { hasGeo, placeLine, priorityColor, priorityMeta } from '../lib/alerts'
import { useTheme } from '../lib/theme'
import type { Alert } from '../types'
import 'leaflet/dist/leaflet.css'

const REGION: [number, number] = [43.02, -77.05]

export function AlertMap({
  alerts,
  interactive,
}: {
  alerts: Alert[]
  interactive: boolean
}) {
  const [theme] = useTheme()
  const located = useMemo(() => alerts.filter(hasGeo), [alerts])
  const center = located.length === 1 ? ([located[0].lat, located[0].lng] as [number, number]) : REGION
  const stroke = theme === 'dark' ? '#f7f9fb' : '#1a1f26'

  return (
    <MapContainer
      center={center}
      zoom={interactive ? 8 : 14}
      zoomControl={interactive}
      dragging={interactive}
      scrollWheelZoom={interactive}
      touchZoom={interactive}
      doubleClickZoom={interactive}
      boxZoom={interactive}
      keyboard={interactive}
      attributionControl
      className="leaflet-root"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {interactive && <FitBounds alerts={located} />}
      {located.map((alert) => {
        const tone = priorityMeta(alert.priority)
        return (
          <CircleMarker
            key={alert.id}
            center={[alert.lat, alert.lng]}
            radius={alert.priority === 5 ? 11 : alert.priority === 4 ? 9 : 7}
            pathOptions={{
              color: stroke,
              weight: 2,
              fillColor: priorityColor(alert.priority),
              fillOpacity: 0.95,
            }}
          >
            {interactive && (
              <Popup>
                <div className="popup">
                  <strong>{alert.title || 'Alert'}</strong>
                  <p>
                    {tone.label}
                    {placeLine(alert) ? ` · ${placeLine(alert)}` : ''}
                  </p>
                  <Link to={`/alert/${encodeURIComponent(alert.id)}`} state={{ from: 'map' }}>
                    Open alert
                  </Link>
                </div>
              </Popup>
            )}
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}

function FitBounds({ alerts }: { alerts: Array<Alert & { lat: number; lng: number }> }) {
  const map = useMap()
  const key = alerts.map((alert) => `${alert.id}:${alert.lat}:${alert.lng}`).join('|')
  useEffect(() => {
    if (alerts.length === 0) {
      map.setView(REGION, 8)
      return
    }
    if (alerts.length === 1) {
      map.setView([alerts[0].lat, alerts[0].lng], 13)
      return
    }
    map.fitBounds(
      alerts.map((alert) => [alert.lat, alert.lng]),
      { padding: [36, 36], maxZoom: 13 },
    )
  }, [map, key, alerts])
  return null
}
