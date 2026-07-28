import { useRef, useState } from 'react'
import { useEditorStore } from '../../../lib/stores/editor-store'
import { useClickOutside } from '../../../hooks/use-click-outside'
import { ColorSection, LineStyleTabs, SliderRow } from './style-popover'
import type { DotShape, Edge, FlowDir } from '../../../canvas/types'

const FLOW_ORDER: FlowDir[] = ['normal', 'reverse', 'alternate']
const FLOW_LABEL: Record<FlowDir, string> = { normal: 'Flujo: normal', reverse: 'Flujo: inverso', alternate: 'Flujo: alterno' }

type PopoverKind = 'style' | 'flow'

const SHAPES: Array<{ v: DotShape; label: string; icon: React.ReactNode }> = [
  { v: 'circle', label: 'Círculo', icon: <circle cx="12" cy="12" r="6" fill="currentColor" /> },
  { v: 'triangle', label: 'Triángulo', icon: <path d="M18 12L7 5.5v13z" fill="currentColor" /> },
  { v: 'diamond', label: 'Rombo', icon: <path d="M12 4l7 8-7 8-7-8z" fill="currentColor" /> },
  {
    v: 'star', label: 'Estrella',
    icon: <path fill="currentColor" d="M12 4.5l2.1 4.6 5 .6-3.7 3.5.9 5-4.3-2.5-4.3 2.5.9-5-3.7-3.5 5-.6z" />,
  },
  { v: 'package', label: 'Paquete', icon: <><rect x="5" y="5" width="14" height="14" rx="2" /><path d="M5 10h14M12 10v9" /></> },
  { v: 'mail', label: 'Correo', icon: <><rect x="4" y="6" width="16" height="12" rx="2" /><path d="M4 7l8 6 8-6" /></> },
]

export function EdgeToolbar({ edge }: { edge: Edge }) {
  const engine = useEditorStore(s => s.engine)
  const [open, setOpen] = useState<PopoverKind | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(null))

  const recentColors = engine.state.usedColors()
  const commit = (p: Partial<Edge>): void => engine.updateEdge(edge.id, p)
  const beginDrag = (): void => engine.sel.pushUndo()
  const live = (p: Partial<Edge>): void => {
    Object.assign(edge, p)
    engine.state.scheduleAutosave()
    engine.notify()
  }

  const cycleFlow = (): void => {
    const i = FLOW_ORDER.indexOf(edge.flowDir)
    commit({ flowDir: FLOW_ORDER[(i + 1) % FLOW_ORDER.length] })
  }

  const fromNode = engine.state.nodeById(edge.from)
  const dotColor = edge.dotColor || fromNode?.color || '#64748B'
  const dotShape = edge.dotShape ?? 'circle'
  const dotSize = edge.dotSize ?? 5
  const dotSpeed = edge.dotSpeed ?? engine.state.settings.speed

  return (
    <div className="sel-toolbar" ref={ref}>
      <div className="sel-toolbar-row">
        <button
          className={open === 'style' ? 'toggled' : ''} aria-label="Estilo" title="Estilo de línea"
          onClick={() => setOpen(open === 'style' ? null : 'style')}
        >
          <svg viewBox="0 0 24 24"><path d="M3 17l4 4L21 7l-4-4z" /></svg>
        </button>
        <button
          className={edge.animated ? 'toggled' : ''} aria-label="Animada" title="Animada"
          onClick={() => commit({ animated: !edge.animated })}
        >
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M3 12h4M17 12h4" /></svg>
        </button>
        {edge.animated && (
          <button
            className={open === 'flow' ? 'toggled' : ''} aria-label="Ajustes de flujo" title="Ajustes de flujo (forma, tamaño, velocidad, color)"
            onClick={() => setOpen(open === 'flow' ? null : 'flow')}
          >
            <svg viewBox="0 0 24 24">
              <line x1="4" y1="7" x2="20" y2="7" /><circle cx="9" cy="7" r="2" fill="currentColor" stroke="none" />
              <line x1="4" y1="12" x2="20" y2="12" /><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
              <line x1="4" y1="17" x2="20" y2="17" /><circle cx="11" cy="17" r="2" fill="currentColor" stroke="none" />
            </svg>
          </button>
        )}
        <button
          className={edge.startArrow ? 'toggled' : ''} aria-label="Punta inicial" title="Punta inicial"
          onClick={() => commit({ startArrow: !edge.startArrow })}
        >
          <svg viewBox="0 0 24 24"><path d="M20 12H6M10 7l-5 5 5 5" /></svg>
        </button>
        <button
          className={edge.endArrow ? 'toggled' : ''} aria-label="Punta final" title="Punta final"
          onClick={() => commit({ endArrow: !edge.endArrow })}
        >
          <svg viewBox="0 0 24 24"><path d="M4 12h14M14 7l5 5-5 5" /></svg>
        </button>
        <button aria-label="Flujo" title={FLOW_LABEL[edge.flowDir]} onClick={cycleFlow}>
          {edge.flowDir === 'alternate'
            ? <svg viewBox="0 0 24 24"><path d="M4 9h16M4 15h16M15 5l4 4-4 4M9 11l-4 4 4 4" /></svg>
            : <svg viewBox="0 0 24 24" style={{ transform: edge.flowDir === 'reverse' ? 'scaleX(-1)' : undefined }}><path d="M4 12h13M13 7l5 5-5 5" /></svg>}
        </button>
        <div className="sel-toolbar-sep" />
        <button aria-label="Duplicar" title="Duplicar (Ctrl+D)" onClick={() => engine.sel.dupSel()}>
          <svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></svg>
        </button>
        <button aria-label="Eliminar" title="Eliminar (Supr)" onClick={() => engine.sel.deleteSel()}>
          <svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
        </button>
      </div>

      {open === 'style' && (
        <div className="sel-popover">
          <LineStyleTabs value={edge.lineStyle} onChange={v => commit({ lineStyle: v })} />
          <SliderRow
            label="Grosor" value={edge.lineWidth ?? 2} min={1} max={8} step={0.5}
            onDragStart={beginDrag} onChange={v => live({ lineWidth: v })}
          />
          <ColorSection value={edge.lineColor || '#64748B'} onChange={c => commit({ lineColor: c })} recentColors={recentColors} />
        </div>
      )}

      {open === 'flow' && (
        <div className="sel-popover">
          <div className="style-section-head">Forma del flujo</div>
          <div className="flow-shape-grid">
            {SHAPES.map(s => (
              <button
                key={s.v}
                className={dotShape === s.v ? 'toggled' : ''}
                aria-label={s.label} title={s.label}
                onClick={() => commit({ dotShape: s.v })}
              >
                <svg viewBox="0 0 24 24">{s.icon}</svg>
              </button>
            ))}
          </div>
          <SliderRow
            label="Tamaño" value={dotSize} min={3} max={14} step={1}
            onDragStart={beginDrag} onChange={v => live({ dotSize: v })}
          />
          <SliderRow
            label="Velocidad" value={dotSpeed} min={0.05} max={2} step={0.05} valueLabel={dotSpeed.toFixed(2) + 'x'}
            onDragStart={beginDrag} onChange={v => live({ dotSpeed: v })}
          />
          <ColorSection value={dotColor} onChange={c => commit({ dotColor: c })} recentColors={recentColors} />
        </div>
      )}
    </div>
  )
}
