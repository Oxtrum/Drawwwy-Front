import { EXTRA_COLORS, PALETTE } from '../../../canvas/config'
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

export function ColorSection({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <>
      <div className="style-section-head">
        Colores de marca
        <label className="add-color">
          <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
          Añadir
          <input type="color" value={value} onChange={ev => onChange(ev.target.value)} />
        </label>
      </div>
      <div className="color-grid">
        {PALETTE.map(p => (
          <button
            key={p.c}
            className={'color-swatch' + (value.toLowerCase() === p.c.toLowerCase() ? ' sel' : '')}
            style={{ background: p.c }}
            title={p.n}
            aria-label={p.n}
            onClick={() => onChange(p.c)}
          >
            {value.toLowerCase() === p.c.toLowerCase() && <Check />}
          </button>
        ))}
      </div>
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
