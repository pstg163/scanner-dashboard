import { useCallback, useEffect, useId, useState } from 'react'
import { RANGE_LABEL } from '../lib/alerts'
import { readMinorChime, writeMinorChime, type MinorChime } from '../lib/chime'
import { isMockMode } from '../lib/mockMode'
import { useAlerts } from '../state/alerts'
import type { SourceType, TimeRange } from '../types'

const RANGES: TimeRange[] = ['1h', '6h', '24h', '7d']
const SOURCES: { id: SourceType; label: string }[] = [
  { id: 'radio', label: 'Radio' },
  { id: 'rss', label: 'RSS' },
  { id: 'cad', label: 'CAD' },
  { id: 'x', label: 'X' },
]
const PRIORITIES = [
  { id: 5, label: 'Urgent' },
  { id: 4, label: 'Serious' },
  { id: 2, label: 'Minor' },
] as const

export function SampleBanner() {
  if (!isMockMode()) return null
  return <p className="sample">Sample data — preview only</p>
}

export function FeedFilters() {
  const { filters, setFilters, counties } = useAlerts()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const extra = [filters.category, filters.priority, filters.source].filter((value) => value != null).length

  return (
    <div className="filters">
      <label className="search">
        <span className="sr">Search alerts</span>
        <input
          id="alert-search"
          name="q"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder="Search town, street, or call"
          value={filters.q}
          onChange={(event) => setFilters({ q: event.target.value })}
        />
      </label>
      <div className="chip-row" role="radiogroup" aria-label="County">
        <button
          type="button"
          className={filters.county == null ? 'chip on' : 'chip'}
          onClick={() => setFilters({ county: null })}
        >
          All
        </button>
        {counties.map((county) => (
          <button
            key={county}
            type="button"
            className={filters.county === county ? 'chip on' : 'chip'}
            onClick={() => setFilters({ county })}
          >
            {county}
          </button>
        ))}
      </div>
      <RangeControl />
      <button type="button" className="text-btn" onClick={() => setOpen(true)}>
        Category, priority, source{extra > 0 ? ` · ${extra}` : ''}
      </button>
      {open && <FilterSheet onClose={close} />}
    </div>
  )
}

export function MapFilterButton() {
  const { filters } = useAlerts()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const narrowed = Boolean(
    filters.county || filters.category || filters.priority != null || filters.source || filters.q || filters.range !== '24h',
  )
  return (
    <>
      <button type="button" className={narrowed ? 'text-btn on' : 'text-btn'} onClick={() => setOpen(true)}>
        Filters{narrowed ? ' on' : ''}
      </button>
      {open && <FilterSheet onClose={close} />}
    </>
  )
}

function RangeControl() {
  const { filters, setFilters } = useAlerts()
  return (
    <div className="range" role="radiogroup" aria-label="Time range">
      {RANGES.map((range) => (
        <button
          key={range}
          type="button"
          role="radio"
          aria-checked={filters.range === range}
          className={filters.range === range ? 'on' : ''}
          onClick={() => setFilters({ range })}
        >
          {RANGE_LABEL[range]}
        </button>
      ))}
    </div>
  )
}

function MinorSoundSetting() {
  const [mode, setMode] = useState<MinorChime>(readMinorChime)

  function choose(next: MinorChime) {
    writeMinorChime(next)
    setMode(next)
  }

  return (
    <fieldset>
      <legend>Minor alert sound</legend>
      <div className="choice-grid">
        <button type="button" className={mode === 'soft' ? 'choice on' : 'choice'} onClick={() => choose('soft')}>
          Soft
        </button>
        <button type="button" className={mode === 'off' ? 'choice on' : 'choice'} onClick={() => choose('off')}>
          Silent
        </button>
      </div>
      <p className="quiet">Priority 2 only. Urgent and serious tones stay on unless the header is muted.</p>
    </fieldset>
  )
}

function FilterSheet({ onClose }: { onClose: () => void }) {
  const { filters, setFilters, clearFilters, categories, counties } = useAlerts()
  const titleId = useId()

  useEffect(() => {
    document.body.classList.add('sheet-open')
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.classList.remove('sheet-open')
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div className="sheet-root">
      <button type="button" className="sheet-backdrop" aria-label="Close filters" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-head">
          <h2 id={titleId}>Filters</h2>
          <button type="button" className="text-btn" onClick={onClose}>
            Done
          </button>
        </div>
        <div className="sheet-body">
          <label className="search">
            <span className="sr">Search alerts</span>
            <input
              id="alert-search-filters"
              name="q"
              type="search"
              autoComplete="off"
              placeholder="Search town, street, or call"
              value={filters.q}
              onChange={(event) => setFilters({ q: event.target.value })}
            />
          </label>
          <fieldset>
            <legend>County</legend>
            <div className="choice-grid">
              <button type="button" className={filters.county == null ? 'choice on' : 'choice'} onClick={() => setFilters({ county: null })}>
                All
              </button>
              {counties.map((county) => (
                <button
                  key={county}
                  type="button"
                  className={filters.county === county ? 'choice on' : 'choice'}
                  onClick={() => setFilters({ county })}
                >
                  {county}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Time</legend>
            <RangeControl />
          </fieldset>
          <fieldset>
            <legend>Priority</legend>
            <div className="choice-grid">
              <button
                type="button"
                className={filters.priority == null ? 'choice on' : 'choice'}
                onClick={() => setFilters({ priority: null })}
              >
                All
              </button>
              {PRIORITIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={filters.priority === item.id ? 'choice on' : 'choice'}
                  onClick={() => setFilters({ priority: item.id })}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Source</legend>
            <div className="choice-grid">
              <button type="button" className={filters.source == null ? 'choice on' : 'choice'} onClick={() => setFilters({ source: null })}>
                All
              </button>
              {SOURCES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={filters.source === item.id ? 'choice on' : 'choice'}
                  onClick={() => setFilters({ source: item.id })}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Category</legend>
            <div className="choice-grid">
              <button
                type="button"
                className={filters.category == null ? 'choice on' : 'choice'}
                onClick={() => setFilters({ category: null })}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={filters.category === category ? 'choice on' : 'choice'}
                  onClick={() => setFilters({ category })}
                >
                  {category}
                </button>
              ))}
            </div>
            {categories.length === 0 && <p className="quiet">Categories show up as alerts load.</p>}
          </fieldset>
          <MinorSoundSetting />
          <button type="button" className="btn secondary" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      </div>
    </div>
  )
}
