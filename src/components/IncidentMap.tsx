import { useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { hasGeo } from '../lib/alerts'
import { geocodePlace, geocodeQuery, type LatLng } from '../lib/geocode'
import type { Alert } from '../types'
import 'leaflet/dist/leaflet.css'

const pinIcon = L.divIcon({
  className: 'pin-icon',
  html: '<span class="pin-glyph" aria-hidden="true"></span>',
  iconSize: [32, 42],
  iconAnchor: [16, 40],
})

type Status = 'loading' | 'ready' | 'unavailable'

function useIncidentPoint(alert: Alert): { point: LatLng | null; status: Status } {
  const stored = hasGeo(alert) ? { lat: alert.lat, lng: alert.lng } : null
  const query = stored ? '' : (geocodeQuery(alert) ?? '')
  const [lookup, setLookup] = useState<{ query: string; point: LatLng | null } | null>(null)

  useEffect(() => {
    if (!query) return
    const controller = new AbortController()
    let active = true
    void geocodePlace(query, controller.signal).then((next) => {
      if (!active) return
      setLookup({ query, point: next })
    })
    return () => {
      active = false
      controller.abort()
    }
  }, [query])

  if (stored) return { point: stored, status: 'ready' }
  if (!query) return { point: null, status: 'unavailable' }
  if (!lookup || lookup.query !== query) return { point: null, status: 'loading' }
  return { point: lookup.point, status: lookup.point ? 'ready' : 'unavailable' }
}

export function IncidentMap({ alert }: { alert: Alert }) {
  const { point, status } = useIncidentPoint(alert)
  if (status !== 'ready' || !point) {
    return (
      <div className="map-fallback" role="status">
        {status === 'loading'
          ? 'Placing this address on the map…'
          : 'This location couldn’t be placed on the map.'}
      </div>
    )
  }
  return (
    <div className="incident-map">
      <MapContainer
        center={[point.lat, point.lng]}
        zoom={15}
        zoomControl
        dragging
        scrollWheelZoom={false}
        attributionControl
        className="leaflet-root"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter lat={point.lat} lng={point.lng} />
        <Marker position={[point.lat, point.lng]} icon={pinIcon} />
      </MapContainer>
    </div>
  )
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], 15)
  }, [map, lat, lng])
  return null
}
