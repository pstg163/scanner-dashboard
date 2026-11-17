import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

export const THEME_KEY = 'scanner-bot.theme'
export const LIGHT_THEME_COLOR = '#f5f6f8'
export const DARK_THEME_COLOR = '#090c11'

const EVENT = 'scanner-theme'

export function readTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_KEY)
    if (value === 'dark' || value === 'light') return value
  } catch {
    // Storage can be blocked; fall through to the default.
  }
  return 'light'
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.style.colorScheme = theme
  const themeColor = document.querySelector('meta[name="theme-color"]')
  if (themeColor) themeColor.setAttribute('content', theme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR)
  const colorScheme = document.querySelector('meta[name="color-scheme"]')
  if (colorScheme) colorScheme.setAttribute('content', theme)
  const statusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
  if (statusBar) statusBar.setAttribute('content', theme === 'dark' ? 'black-translucent' : 'default')
}

export function writeTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // The choice still applies for this tab when storage is blocked.
  }
  applyTheme(theme)
  window.dispatchEvent(new Event(EVENT))
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(readTheme)
  useEffect(() => {
    const sync = () => setThemeState(readTheme())
    window.addEventListener(EVENT, sync)
    return () => window.removeEventListener(EVENT, sync)
  }, [])
  return [theme, writeTheme]
}
