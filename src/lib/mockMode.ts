let enabled = false

export function resolveMockFlag(): void {
  if (!import.meta.env.DEV) return
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (url.searchParams.get('mock') === '1') {
    sessionStorage.setItem('scanner-bot.mock', '1')
    url.searchParams.delete('mock')
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
    enabled = true
    return
  }
  enabled = sessionStorage.getItem('scanner-bot.mock') === '1'
}

export function isMockMode(): boolean {
  return enabled
}
