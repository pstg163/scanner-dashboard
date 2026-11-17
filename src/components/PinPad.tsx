import { useEffect, useState } from 'react'
import { formatRemain } from '../lib/alerts'
import { useSession } from '../state/session'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

export function PinPad() {
  const { unlock, checking, pinError, lockedUntil } = useSession()
  const [digits, setDigits] = useState('')
  const [shake, setShake] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const locked = lockedUntil != null && lockedUntil > now

  useEffect(() => {
    if (!lockedUntil) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [lockedUntil])

  async function press(digit: string) {
    if (checking || locked || digits.length >= 6) return
    const next = digits + digit
    setDigits(next)
    if (next.length < 6) return
    const ok = await unlock(next)
    if (!ok) {
      setDigits('')
      setShake((value) => value + 1)
    }
  }

  function backspace() {
    if (checking || locked) return
    setDigits((value) => value.slice(0, -1))
  }

  const remain = locked && lockedUntil ? formatRemain(lockedUntil - now) : ''

  return (
    <main className="pin-screen">
      <header className="pin-intro">
        <p className="eyebrow">Upstate New York</p>
        <h1 className="wordmark pin-word">
          Scanner <span>Bot</span>
        </h1>
        <p className="lede">Enter the dashboard PIN. This phone keeps it until you lock the app.</p>
      </header>

      <div className="pin-status">
        <div key={shake} className={pinError ? 'dots shake' : 'dots'} aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <span key={index} className={index < digits.length ? 'dot on' : 'dot'} />
          ))}
        </div>
        <p className="pin-message" role="status">
          {locked
            ? `Too many attempts. Try again in ${remain}.`
            : checking
              ? 'Checking PIN…'
              : pinError || '6 digits'}
        </p>
      </div>

      <div className="pad" aria-label="PIN keypad">
        {KEYS.map((digit) => (
          <button key={digit} type="button" className="key" onClick={() => void press(digit)} disabled={checking || locked}>
            {digit}
          </button>
        ))}
        <span className="key-spacer" />
        <button type="button" className="key" onClick={() => void press('0')} disabled={checking || locked}>
          0
        </button>
        <button type="button" className="key key-ghost" onClick={backspace} disabled={checking || locked} aria-label="Delete last digit">
          ⌫
        </button>
      </div>
      <p className="pin-counties">Ontario · Seneca · Wayne · Yates · Monroe · Cayuga · Onondaga</p>
    </main>
  )
}
