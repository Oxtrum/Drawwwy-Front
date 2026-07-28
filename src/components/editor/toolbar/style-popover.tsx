import { useState } from 'react'
import { EXTRA_COLORS } from '../../../canvas/config'
import type { LineStyle } from '../../../canvas/types'

export function LineStyleTabs({ value, onChange }: { value: LineStyle; onChange: (v: LineStyle) => void }) {
  const opts: Array<{ v: LineStyle; dash: string }> = [
    { v: 'solid', dash: 'none' },
    { v: 'dashed', dash: '5,3' },
    { v: 'dotted', dash: '1.5,3.5' },
  ]
  return (
    <div className="style-tabs">
      {opts.map(o => (
        <button
          key={o.v}
          className={value === o.v ? 'toggled' : ''}
          aria-label={o.v}
          onClick={() => onChange(o.v)}
        >
          <svg viewBox="0 0 40 8"><line x1="2" y1="4" x2="38" y2="4" strokeDasharray={o.dash} /></svg>
        </button>
      ))}
    </div>
  )
}

export function SliderRow(
  { label, value, min, max, step, valueLabel, onDragStart, onChange }:
  {
    label: string; value: number; min: number; max: number; step: number; valueLabel?: string
    onDragStart?: () => void; onChange: (v: number) => void
  },
) {
  return (
    <div className="style-slider">
      <div className="style-slider-head">
        <span>{label}</span>
        {valueLabel !== undefined && <span>{valueLabel}</span>}
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onPointerDown={onDragStart}
        onChange={ev => onChange(+ev.target.value)}
      />
    </div>
  )
}

export function ColorSection(
  { value, onChange, recentColors }: { value: string; onChange: (c: string) => void; recentColors: string[] },
) {
  const [draft, setDraft] = useState<string | null>(null)

  return (
    <>
      <div className="style-section-head">
        Colores recientes
        <label className="add-color">
          <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
          Añadir
          <input type="color" value={draft ?? value ?? '#000000'} onChange={ev => setDraft(ev.target.value)} />
        </label>
      </div>
      {draft !== null && (
        <div className="add-color-confirm">
          <span className="add-color-preview" style={{ background: draft }} />
          <button className="add-color-accept" onClick={() => { onChange(draft); setDraft(null) }}>Aceptar</button>
          <button className="add-color-cancel" aria-label="Cancelar" onClick={() => setDraft(null)}>
            <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      )}
      {recentColors.length > 0 && (
        <div className="color-grid">
          {recentColors.map(c => (
            <button
              key={c}
              className={'color-swatch' + (value.toLowerCase() === c.toLowerCase() ? ' sel' : '')}
              style={{ background: c }}
              aria-label={c}
              onClick={() => onChange(c)}
            >
              {value.toLowerCase() === c.toLowerCase() && <Check />}
            </button>
          ))}
        </div>
      )}
      <div className="style-section-head">Todos los colores</div>
      <div className="color-grid scroll">
        {EXTRA_COLORS.map(c => (
          <button
            key={c}
            className={'color-swatch' + (value.toLowerCase() === c.toLowerCase() ? ' sel' : '')}
            style={{ background: c }}
            aria-label={c}
            onClick={() => onChange(c)}
          >
            {value.toLowerCase() === c.toLowerCase() && <Check />}
          </button>
        ))}
      </div>
    </>
  )
}

function Check() {
  return <svg viewBox="0 0 24 24" className="check"><path d="M5 13l4 4L19 7" /></svg>
}
