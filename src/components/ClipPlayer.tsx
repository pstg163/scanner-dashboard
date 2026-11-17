import { useEffect, useState } from 'react'
import { getApi } from '../api'
import { isAbortError, isDashboardError } from '../api/dashboard'
import { useSession } from '../state/session'

export function ClipPlayer({ id, clipPath }: { id: string; clipPath: string | null }) {
  const { pin, kickout, lockFor } = useSession()
  const [url, setUrl] = useState<string | null>(null)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (!clipPath || !pin) return
    const controller = new AbortController()
    void (async () => {
      try {
        const api = await getApi()
        const clip = await api.clip(pin, id, controller.signal)
        if (controller.signal.aborted) return
        setUrl(clip.url)
        setPhase('ready')
      } catch (err) {
        if (controller.signal.aborted || isAbortError(err)) return
        if (isDashboardError(err) && (err.status === 401 || err.status === 403)) {
          kickout("That PIN wasn't accepted.")
          return
        }
        if (isDashboardError(err) && err.status === 429) {
          lockFor(err.retryAfter ?? 60)
          setPhase('error')
          return
        }
        if (isDashboardError(err) && (err.code === 'no clip' || err.status === 404)) {
          setPhase('error')
          return
        }
        setPhase('error')
      }
    })()
    return () => controller.abort()
  }, [clipPath, pin, id, kickout, lockFor])

  if (!clipPath) return null

  return (
    <section className="clip">
      <h2>Radio clip</h2>
      {phase === 'loading' && <p className="quiet">Getting the audio…</p>}
      {phase === 'error' && <p className="quiet">The clip didn’t load. Open the alert again in a moment.</p>}
      {phase === 'ready' && url && <audio controls preload="metadata" src={url} />}
    </section>
  )
}
