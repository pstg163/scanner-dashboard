/** Short codes and HTTP 200 deep links. Full ids are `<millis>-<8 hex>`. */

const SHORT_CODE = /^[A-Za-z0-9]{6,8}$/

export function isShortAlertCode(value: string): boolean {
  return SHORT_CODE.test(value)
}

export function alertShortCode(id: string): string {
  const trimmed = id.trim()
  const cut = trimmed.lastIndexOf('-')
  if (cut >= 0) {
    const suffix = trimmed.slice(cut + 1)
    if (/^[A-Za-z0-9]{6,12}$/.test(suffix)) return suffix
  }
  return trimmed
}

export function alertMatchesCode(alertId: string, code: string): boolean {
  if (!code) return false
  if (alertId === code) return true
  return alertId.endsWith(`-${code}`) || alertShortCode(alertId) === code
}

/** Path that GitHub Pages serves as index.html (HTTP 200): /?a=<code> */
export function alertQueryPath(code: string): string {
  return `/?a=${encodeURIComponent(code)}`
}

/**
 * Alert id or short code from a 200-OK root link.
 * Supports `?a=CODE`, `?alert=ID`, and hash forms `#/a/CODE` or `#/alert/ID`.
 */
export function deepLinkId(search = '', hash = ''): string | null {
  const query = search.startsWith('?') ? search.slice(1) : search
  const params = new URLSearchParams(query)
  const fromQuery = (params.get('a') || params.get('alert') || '').trim()
  if (fromQuery) return fromQuery
  const match = (hash || '').match(/^#\/(?:a|alert)\/([^/?#]+)/i)
  if (!match) return null
  try {
    return decodeURIComponent(match[1]).trim() || null
  } catch {
    return match[1] || null
  }
}
