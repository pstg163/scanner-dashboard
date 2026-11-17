type Props = { size?: number }

export function IconLock({ size = 22 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function IconList({ size = 22 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 7h12M8 12h12M8 17h12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 7h.01M4 12h.01M4 17h.01" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

export function IconMap({ size = 22 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="10" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

export function IconFlame({ size = 20 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3c1.5 3 5.5 4.8 5.5 10a5.5 5.5 0 0 1-11 0c0-2.4 1.2-4 2.4-5.6C10 9 11 9.2 12 3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconCrosshair({ size = 20 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 2.5v3.5M12 18v3.5M2.5 12H6M18 12h3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function IconCar({ size = 20 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 15v2M20 15v2M5 15l1.4-4.2A2 2 0 0 1 8.3 9h7.4a2 2 0 0 1 1.9 1.8L19 15M4 15h16v2a1 1 0 0 1-1 1h-1.2a1 1 0 0 1-1-1v-.2H7.2V17a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="16.5" r="1" fill="currentColor" />
      <circle cx="16.5" cy="16.5" r="1" fill="currentColor" />
    </svg>
  )
}

export function IconHeart({ size = 20 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconShield({ size = 20 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.5 19 6.5v5.2c0 4.2-2.8 7-7 8.8-4.2-1.8-7-4.6-7-8.8V6.5L12 3.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconSound({ size = 22 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 10h3l4-3v10l-4-3H4v-4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M16 9.2a3.8 3.8 0 0 1 0 5.6M18.2 7a6.4 6.4 0 0 1 0 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function IconMuted({ size = 22 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 10h3l4-3v10l-4-3H4v-4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M16 10l4 4M20 10l-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function IconRadio({ size = 20 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="13" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 13a4 4 0 0 1 8 0M5.5 13a6.5 6.5 0 0 1 13 0M12 4.5v4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function categoryKind(category: string | null): 'gun' | 'fire' | 'car' | 'med' | 'police' | 'radio' {
  const text = (category ?? '').toLowerCase()
  if (/shot|gun|firearm|weapon/.test(text)) return 'gun'
  if (/medic|ems|unresponsive|cardiac|breathing/.test(text)) return 'med'
  if (/officer|fight|assist|police/.test(text)) return 'police'
  if (/mva|crash|vehicle|collision/.test(text)) return 'car'
  if (/fire|brush|smoke|alarm/.test(text)) return 'fire'
  return 'radio'
}

export function CategoryMark({ category }: { category: string | null }) {
  const kind = categoryKind(category)
  return (
    <span className={`mark mark-${kind}`}>
      {kind === 'gun' && <IconCrosshair />}
      {kind === 'fire' && <IconFlame />}
      {kind === 'car' && <IconCar />}
      {kind === 'med' && <IconHeart />}
      {kind === 'police' && <IconShield />}
      {kind === 'radio' && <IconRadio />}
    </span>
  )
}
