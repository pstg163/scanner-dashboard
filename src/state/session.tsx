import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { getApi } from '../api'
import { errorMessage, isDashboardError } from '../api/dashboard'
import { clearStoredPin, isPin, readStoredPin, storePin } from '../lib/pin'

type SessionValue = {
  pin: string | null
  checking: boolean
  pinError: string | null
  lockedUntil: number | null
  unlock: (pin: string) => Promise<boolean>
  lock: () => void
  kickout: (message?: string) => void
  lockFor: (seconds: number) => void
}

const SessionContext = createContext<SessionValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [pin, setPin] = useState<string | null>(() => readStoredPin())
  const [checking, setChecking] = useState(false)
  const [pinError, setPinError] = useState<string | null>(null)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)

  const lockFor = useCallback((seconds: number) => {
    const wait = Number.isFinite(seconds) && seconds > 0 ? seconds : 60
    setLockedUntil(Date.now() + wait * 1000)
  }, [])

  const kickout = useCallback((message?: string) => {
    clearStoredPin()
    setPin(null)
    setPinError(message ?? "That PIN wasn't accepted.")
  }, [])

  const lock = useCallback(() => {
    clearStoredPin()
    setPin(null)
    setPinError(null)
    setChecking(false)
  }, [])

  const unlock = useCallback(
    async (nextPin: string) => {
      if (lockedUntil && Date.now() < lockedUntil) return false
      if (!isPin(nextPin)) {
        setPinError('Enter all 6 digits.')
        return false
      }
      setChecking(true)
      setPinError(null)
      try {
        const api = await getApi()
        await api.list(nextPin, { limit: 1 })
        storePin(nextPin)
        setPin(nextPin)
        return true
      } catch (err) {
        if (isDashboardError(err) && (err.status === 401 || err.status === 403)) {
          clearStoredPin()
          setPin(null)
          setPinError("That PIN wasn't accepted.")
          return false
        }
        if (isDashboardError(err) && err.status === 429) {
          lockFor(err.retryAfter ?? 60)
          setPinError(null)
          return false
        }
        setPinError(errorMessage(err))
        return false
      } finally {
        setChecking(false)
      }
    },
    [lockFor, lockedUntil],
  )

  const value = useMemo(
    () => ({ pin, checking, pinError, lockedUntil, unlock, lock, kickout, lockFor }),
    [pin, checking, pinError, lockedUntil, unlock, lock, kickout, lockFor],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used within SessionProvider')
  return value
}
