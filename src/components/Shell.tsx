import type { ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { formatRelative } from '../lib/alerts'
import { readMuted, unlockAudio, writeMuted } from '../lib/chime'
import { useAlerts } from '../state/alerts'
import { useSession } from '../state/session'
import { IconList, IconLock, IconMap, IconMuted, IconSound } from './icons'
import { SampleBanner } from './Filters'

export function Shell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const showTabs = pathname === '/' || pathname === '/map'
  return (
    <div className="app">
      <Header />
      <SampleBanner />
      <main className="main">{children}</main>
      {showTabs && (
        <nav className="tabbar" aria-label="Primary">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'on' : '')}>
            <IconList />
            Alerts
          </NavLink>
          <NavLink to="/map" className={({ isActive }) => (isActive ? 'on' : '')}>
            <IconMap />
            Map
          </NavLink>
        </nav>
      )}
    </div>
  )
}

function useBackTarget(): { to: string; label: string } {
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  if (from === 'map') return { to: '/map', label: 'Map' }
  return { to: '/', label: 'Alerts' }
}

function Header() {
  const { lock } = useSession()
  const { refreshing, lastSync, now, status } = useAlerts()
  const { pathname } = useLocation()
  const back = useBackTarget()
  const onDetail = pathname.startsWith('/alert/')
  const [muted, setMuted] = useState(readMuted)

  function toggleMute() {
    unlockAudio()
    const next = !muted
    writeMuted(next)
    setMuted(next)
  }

  return (
    <header className="topbar">
      {onDetail ? (
        <Link to={back.to} className="back-link">
          {back.label}
        </Link>
      ) : (
        <Link to="/" className="wordmark">
          Scanner <span>Bot</span>
        </Link>
      )}
      {!onDetail && (
        <p className="sync">
          <span className={refreshing || status === 'loading' ? 'live-dot busy' : 'live-dot'} />
          {refreshing || status === 'loading'
            ? 'Checking'
            : lastSync
              ? `Synced ${formatRelative(new Date(lastSync).toISOString(), now)}`
              : 'Live'}
        </p>
      )}
      <div className="top-actions">
        <button
          type="button"
          className={muted ? 'icon-btn is-muted' : 'icon-btn'}
          onClick={toggleMute}
          aria-pressed={muted}
          aria-label={muted ? 'Unmute alert sounds' : 'Mute alert sounds'}
        >
          {muted ? <IconMuted /> : <IconSound />}
        </button>
        <button type="button" className="icon-btn" onClick={lock} aria-label="Lock dashboard">
          <IconLock />
        </button>
      </div>
    </header>
  )
}
