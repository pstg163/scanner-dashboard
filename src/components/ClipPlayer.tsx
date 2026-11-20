import { useEffect, useState } from 'react'
import { getApi } from '../api'
import { isAbortError, isDashboardError } from '../api/dashboard'

export function ClipPlayer({ id, clipPath }: { id: string; clipPath: string | null }) {
  const [url, setUrl] = useState<string | null>(null)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    if (!clipPath) return
    const controller = new AbortController()
    void (async () => {
      try {
        const api = await getApi()
        const clip = await api.clip(id, controller.signal)
        if (controller.signal.aborted) return
        setUrl(clip.url)
        setPhase('ready')
      } catch (err) {
        if (controller.signal.aborted || isAbortError(err)) return
        if (isDashboardError(err) && (err.code === 'no clip' || err.status === 404)) {
          setPhase('error')
          return
        }
        setPhase('error')
      }
    })()
    return () => controller.abort()
  }, [clipPath, id])

  if (!clipPath) {
    return <p className="quiet">No audio clip was attached.</p>
  }

  return (
    <div className="audio-shell">
      {phase === 'loading' && <p className="quiet">Getting the audio…</p>}
      {phase === 'error' && <p className="quiet">The clip didn’t load. Open the alert again in a moment.</p>}
      {phase === 'ready' && url && <audio controls preload="metadata" src={url} aria-label="Dispatch audio" />}
    </div>
  )
}
