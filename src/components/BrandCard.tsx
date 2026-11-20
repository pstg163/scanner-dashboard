import type { ReactNode } from 'react'
import { IconRadio } from './icons'

export function BrandCard({ action }: { action?: ReactNode }) {
  return (
    <section className="brand-card">
      <div className="brand-card-main">
        <span className="brand-badge" aria-hidden="true">
          <IconRadio size={22} />
        </span>
        <div className="brand-copy">
          <p className="brand-name">
            Scanner <span>Bot</span>
          </p>
          <p className="brand-tag">Live police, fire, and EMS alerts for the Finger Lakes</p>
        </div>
      </div>
      {action}
    </section>
  )
}
