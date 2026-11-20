import { locationSearchQuery } from './alerts.ts'
import type { Alert } from '../types.ts'

function isAbort(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError'
}

export type LatLng = { lat: number; lng: number }

const cache = new Map<string, LatLng | null>()

/** Rough New York box, with a little margin for border roads. */
export function inNewYork(lat: number, lng: number): boolean {
  return lat >= 40.4 && lat <= 45.2 && lng >= -79.9 && lng <= -71.7
}

export function geocodeQuery(alert: Alert): string | null {
  return locationSearchQuery(alert)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function parsePhotonBody(body: unknown): LatLng | null {
  if (!isRecord(body) || !Array.isArray(body.features)) return null
  const feature = body.features[0]
  if (!isRecord(feature) || !isRecord(feature.geometry)) return null
  const coords = feature.geometry.coordinates
  if (!Array.isArray(coords) || coords.length < 2) return null
  const lng = coords[0]
  const lat = coords[1]
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inNewYork(lat, lng)) return null
  return { lat, lng }
}

export function parseNominatimBody(body: unknown): LatLng | null {
  if (!Array.isArray(body) || !isRecord(body[0])) return null
  const lat = Number(body[0].lat)
  const lng = Number(body[0].lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inNewYork(lat, lng)) return null
  return { lat, lng }
}

async function lookup(query: string, signal?: AbortSignal): Promise<LatLng | null> {
  const photonUrl = `https://photon.komoot.io/api/?limit=1&lat=43.05&lon=-76.8&q=${encodeURIComponent(query)}`
  try {
    const response = await fetch(photonUrl, { signal, headers: { Accept: 'application/json' } })
    if (response.ok) {
      const point = parsePhotonBody(await response.json())
      if (point) return point
    }
  } catch (err) {
    if (signal?.aborted || isAbort(err)) throw err
  }
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=us&q=${encodeURIComponent(query)}`
  const response = await fetch(nominatimUrl, {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) return null
  return parseNominatimBody(await response.json())
}

/** Client-side geocode of an address string. Results are cached for the session. */
export async function geocodePlace(query: string, signal?: AbortSignal): Promise<LatLng | null> {
  const trimmed = query.trim()
  if (!trimmed) return null
  const key = trimmed.toLowerCase()
  if (cache.has(key)) return cache.get(key) ?? null
  try {
    const point = await lookup(trimmed, signal)
    if (!signal?.aborted) cache.set(key, point)
    return point
  } catch (err) {
    if (signal?.aborted || isAbort(err)) return null
    return null
  }
}
