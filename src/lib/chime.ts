import type { Alert } from '../types'

const MUTE_KEY = 'scanner-bot.muted'
const MINOR_KEY = 'scanner-bot.minor-chime'

export type MinorChime = 'soft' | 'off'
export type ChimeKind = 'urgent' | 'ding' | 'soft' | 'none'

export function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export function writeMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    // The toggle still updates for this tab when storage is blocked.
  }
}

export function readMinorChime(): MinorChime {
  try {
    return localStorage.getItem(MINOR_KEY) === 'off' ? 'off' : 'soft'
  } catch {
    return 'soft'
  }
}

export function writeMinorChime(mode: MinorChime): void {
  try {
    localStorage.setItem(MINOR_KEY, mode)
  } catch {
    // Ignore storage failures. The in-memory choice still applies.
  }
}

/** Priority 5 is a triple tone, 4 is a ding, and anything quieter follows the minor setting. */
export function chimeKind(priority: number | null, minor: MinorChime): ChimeKind {
  if (priority != null && priority >= 5) return 'urgent'
  if (priority != null && priority >= 4) return 'ding'
  return minor === 'off' ? 'none' : 'soft'
}

/** Ids in this poll payload that were not already on screen. */
export function unseenAlerts(previousIds: ReadonlySet<string>, incoming: Alert[]): Alert[] {
  const seen = new Set<string>()
  const fresh: Alert[] = []
  for (const alert of incoming) {
    if (previousIds.has(alert.id) || seen.has(alert.id)) continue
    seen.add(alert.id)
    fresh.push(alert)
  }
  return fresh
}

export function loudest(alerts: Alert[]): Alert | null {
  let best: Alert | null = null
  for (const alert of alerts) {
    if (!best || (alert.priority ?? 0) > (best.priority ?? 0)) best = alert
  }
  return best
}

let audio: AudioContext | null = null
let unlockInstalled = false

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const host = window as Window & { webkitAudioContext?: typeof AudioContext }
  const Ctx = window.AudioContext ?? host.webkitAudioContext
  if (!Ctx) return null
  if (!audio) audio = new Ctx()
  return audio
}

/** Create or resume the audio graph. Call this from a tap so mobile browsers allow later chimes. */
export function unlockAudio(): void {
  const ctx = context()
  if (!ctx || ctx.state === 'running') return
  void ctx.resume()
  try {
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start()
  } catch {
    // A later tap retries the unlock.
  }
}

export function installAudioUnlock(): void {
  if (unlockInstalled || typeof window === 'undefined') return
  unlockInstalled = true
  const unlock = () => unlockAudio()
  window.addEventListener('pointerdown', unlock, { capture: true })
  window.addEventListener('touchend', unlock, { capture: true })
  window.addEventListener('keydown', unlock, { capture: true })
}

function tone(
  ctx: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  peak: number,
  type: OscillatorType,
) {
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, start)
  amp.gain.setValueAtTime(0.0001, start)
  amp.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), start + 0.012)
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(amp)
  amp.connect(ctx.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

export function playChime(kind: Exclude<ChimeKind, 'none'>): void {
  const ctx = context()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()
  const start = ctx.currentTime + 0.02
  if (kind === 'urgent') {
    tone(ctx, 880, start, 0.11, 0.2, 'square')
    tone(ctx, 880, start + 0.16, 0.11, 0.2, 'square')
    tone(ctx, 1175, start + 0.32, 0.2, 0.24, 'square')
    return
  }
  if (kind === 'ding') {
    tone(ctx, 784, start, 0.28, 0.16, 'sine')
    tone(ctx, 1175, start, 0.16, 0.05, 'sine')
    return
  }
  tone(ctx, 523, start, 0.16, 0.05, 'sine')
}

export function vibrateFor(priority: number | null): void {
  if (priority == null || priority < 4) return
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  try {
    if (priority >= 5) navigator.vibrate([90, 50, 90, 50, 140])
    else navigator.vibrate(140)
  } catch {
    // Some browsers expose vibrate and still reject the call.
  }
}

export function signalNewAlerts(fresh: Alert[]): void {
  if (fresh.length === 0) return
  const top = loudest(fresh)
  if (!top) return
  const kind = chimeKind(top.priority, readMinorChime())
  if (!readMuted() && kind !== 'none') playChime(kind)
  vibrateFor(top.priority)
}
