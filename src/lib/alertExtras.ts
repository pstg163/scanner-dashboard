/** Display fields stored on the alert row or inside `raw` by the monitor. */

export const ALERT_EXTRA_KEYS = [
  'listen_url',
  'map',
  'cross_streets',
  'agency',
  'place',
  'incident_id',
  'call_type',
  'cad_time',
  'status',
  'transmission_time',
  'correction_note',
] as const

export type AlertExtraKey = (typeof ALERT_EXTRA_KEYS)[number]

export type AlertExtras = Record<AlertExtraKey, string | null>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function clean(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function readAlertExtras(row: Record<string, unknown>): AlertExtras {
  const raw = isRecord(row.raw) ? row.raw : null
  const extras = {} as AlertExtras
  for (const key of ALERT_EXTRA_KEYS) {
    extras[key] = clean(row[key]) ?? (raw ? clean(raw[key]) : null)
  }
  return extras
}
