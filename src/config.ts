const DEFAULT_URL = 'https://dfquewlihcgbrbhuwlgf.supabase.co'

export const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL).replace(/\/$/, '')

export const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''

export const functionUrl = `${supabaseUrl}/functions/v1/dashboard`

export const POLL_MS = 12_000

export const PAGE_LIMIT = 100

export const MAX_DRAIN_PAGES = 20

export function dashboardHeaders(): Headers {
  const headers = new Headers()
  if (import.meta.env.VITE_SUPABASE_USE_APIKEY === 'true' && publishableKey) {
    headers.set('apikey', publishableKey)
    headers.set('Authorization', `Bearer ${publishableKey}`)
  }
  return headers
}
