const STORAGE_KEY = 'scanner-bot.pin'

export function isPin(value: string): boolean {
  return /^\d{6}$/.test(value)
}

export function readStoredPin(): string | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value && isPin(value) ? value : null
  } catch {
    return null
  }
}

export function storePin(pin: string): void {
  if (!isPin(pin)) return
  try {
    localStorage.setItem(STORAGE_KEY, pin)
  } catch {
    // Private mode can reject storage. The PIN still lives in memory for this tab.
  }
}

export function clearStoredPin(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore storage failures. The in-memory session is cleared by the caller.
  }
}
