/** Short codes for GroupMe /a/<code> links. Full ids are `<millis>-<8 hex>`. */

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
