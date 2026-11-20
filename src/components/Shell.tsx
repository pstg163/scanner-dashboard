import type { ReactNode } from 'react'
import { Link, NavLink, useLocation, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { formatRelative } from '../lib/alerts'
import { deepLinkId } from '../lib/shortId'
import { audioReady, playChime, readMuted, unlockAudio, writeMuted } from '../lib/chime'
import { useAlerts } from '../state/alerts'
import { useTheme } from '../lib/theme'
import { IconMuted, IconRadio, IconSound } from './icons'
import { SampleBanner } from './Filters'

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <Header />
      <SoundBar />
      <SampleBanner />
      <main className="main">{children}</main>
    </div>
  )
}

function SoundBar() {
  const [ready, setReady] = useState(audioReady)
  useEffect(() => {
    const t = window.setInterval(() => setReady(audioReady()), 1000)
    return () => window.clearInterval(t)
  }, [])
  function test() {
    unlockAudio()
    playChime('ding')
    window.setTimeout(() => setReady(audioReady()), 300)
  }
  return (
    <div className={ready ? 'soundbar ok' : 'soundbar off'}>
      <span>{ready ? 'Alert sounds on' : 'Sound is blocked until you click'}</span>
      <button type="button" onClick={test}>{ready ? 'Test sound' : 'Turn on sound'}</button>
    </div>
  )
}

function Header() {
  const { refreshing, lastSync, now, status } = useAlerts()
  const { pathname } = useLocation()
  const [search] = useSearchParams()
  const onDetail =
    pathname.startsWith('/alert/') ||
    pathname.startsWith('/a/') ||
    Boolean(deepLinkId(`?${search.toString()}`, typeof window === 'undefined' ? '' : window.location.hash))
  const [muted, setMuted] = useState(readMuted)

  function toggleMute() {
    unlockAudio()
    const next = !muted
    writeMuted(next)
    setMuted(next)
  }

  return (
    <header className="topbar">
      <Link to="/" className="brand-lockup">
        <span className="brand-badge sm" aria-hidden="true">
          <IconRadio size={16} />
        </span>
        <span className="wordmark">
          Scanner <span>Bot</span>
        </span>
      </Link>
      <nav className="topnav" aria-label="Primary">
        <Link to="/" className={onDetail || pathname !== '/' ? 'nav-link' : 'nav-link on'} aria-current={onDetail || pathname !== '/' ? undefined : 'page'}>
          Alerts
        </Link>
        <NavLink to="/map" className={({ isActive }) => (isActive ? 'nav-link on' : 'nav-link')}>
          Map
        </NavLink>
      </nav>
      <p className="sync">
        <span className={refreshing || status === 'loading' ? 'live-dot busy' : 'live-dot'} />
        <span className="sync-label">
          {refreshing || status === 'loading'
            ? 'Checking'
            : lastSync
              ? `Synced ${formatRelative(new Date(lastSync).toISOString(), now)}`
              : 'Live'}
        </span>
      </p>
      <div className="top-actions">
        <ThemeToggle />
        <button
          type="button"
          className={muted ? 'icon-btn is-muted' : 'icon-btn'}
          onClick={toggleMute}
          aria-pressed={muted}
          aria-label={muted ? 'Unmute alert sounds' : 'Mute alert sounds'}
        >
          {muted ? <IconMuted /> : <IconSound />}
        </button>
      </div>
    </header>
  )
}

function ThemeToggle() {
  const [theme, setTheme] = useTheme()
  return (
    <div className="theme-toggle" role="group" aria-label="Color theme">
      <button
        type="button"
        className={theme === 'light' ? 'on' : ''}
        aria-pressed={theme === 'light'}
        onClick={() => setTheme('light')}
      >
        Light
      </button>
      <button
        type="button"
        className={theme === 'dark' ? 'on' : ''}
        aria-pressed={theme === 'dark'}
        onClick={() => setTheme('dark')}
      >
        Dark
      </button>
    </div>
  )
}
