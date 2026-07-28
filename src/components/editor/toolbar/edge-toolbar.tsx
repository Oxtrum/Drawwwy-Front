import { useRef, useState } from 'react'
import { useEditorStore } from '../../../lib/stores/editor-store'
import { useClickOutside } from '../../../hooks/use-click-outside'
import { ColorSection, LineStyleTabs, SliderRow, SwitchRow } from './style-popover'
import type { DotShape, Edge, FlowDir } from '../../../canvas/types'

const FLOW_ORDER: FlowDir[] = ['normal', 'reverse', 'alternate']
const FLOW_LABEL: Record<FlowDir, string> = { normal: 'Flujo: normal', reverse: 'Flujo: inverso', alternate: 'Flujo: alterno' }

type PopoverKind = 'style' | 'flow'

const JSON_ICON_D = 'M221.37 618.44h757.94V405.15H755.14c-23.5 0-56.32-12.74-71.82-28.24-15.5-15.5-25-43.47-25-66.97V82.89H88.39c-1.99 0-3.49 1-4.49 2-1.5 1-2 2.5-2 4.5v1155.04c0 1.5 1 3.5 2 4.5 1 1.49 3 1.99 4.49 1.99H972.8c2 0 1.89-.99 2.89-1.99 1.5-1 3.61-3 3.61-4.5v-121.09H221.36c-44.96 0-82-36.9-82-81.99V700.44c0-45.1 36.9-82 82-82zm126.51 117.47h75.24v146.61c0 30.79-2.44 54.23-7.33 70.31-4.92 16.03-14.8 29.67-29.65 40.85-14.86 11.12-33.91 16.72-57.05 16.72-24.53 0-43.51-3.71-56.94-11.06-13.5-7.36-23.89-18.1-31.23-32.3-7.35-14.14-11.69-31.67-12.99-52.53l71.5-10.81c.11 11.81 1.07 20.61 2.81 26.33 1.76 5.78 4.75 10.37 9 13.95 2.87 2.33 6.94 3.46 12.25 3.46 8.4 0 14.58-3.46 18.53-10.37 3.9-6.92 5.87-18.6 5.87-35V735.92zm112.77 180.67l71.17-4.97c1.54 12.81 4.69 22.62 9.44 29.28 7.74 10.88 18.74 16.34 33.09 16.34 10.68 0 18.93-2.76 24.68-8.36 5.81-5.58 8.7-12.07 8.7-19.41 0-6.97-2.71-13.26-8.2-18.79-5.47-5.53-18.23-10.68-38.28-15.65-32.89-8.17-56.27-19.1-70.26-32.74-14.12-13.57-21.18-30.92-21.18-52.03 0-13.83 3.61-26.89 10.85-39.21 7.22-12.38 18.07-22.06 32.59-29.09 14.52-7.04 34.4-10.56 59.65-10.56 31 0 54.62 6.41 70.88 19.29 16.28 12.81 25.92 33.24 29.04 61.27l-70.5 4.65c-1.87-12.25-5.81-21.17-11.81-26.7-6.05-5.6-14.35-8.36-24.9-8.36-8.71 0-15.31 2.07-19.73 6.16-4.4 4.09-6.59 9.12-6.59 15.02 0 4.27 1.81 8.11 5.37 11.57 3.45 3.59 11.8 6.85 25.02 9.93 32.75 7.86 56.2 15.84 70.31 23.87 14.18 8.05 24.52 17.98 30.96 29.92 6.44 11.88 9.66 25.2 9.66 39.96 0 17.29-4.3 33.24-12.88 47.89-8.63 14.58-20.61 25.7-36.08 33.24-15.41 7.54-34.85 11.31-58.33 11.31-41.24 0-69.81-8.86-85.68-26.52-15.88-17.65-24.85-40.09-26.96-67.3zm248.74-45.5c0-44.05 11.02-78.36 33.09-102.87 22.09-24.57 52.82-36.82 92.24-36.82 40.38 0 71.5 12.07 93.34 36.13 21.86 24.13 32.77 57.94 32.77 101.37 0 31.54-4.75 57.36-14.3 77.54-9.54 20.18-23.37 35.89-41.4 47.13-18.07 11.24-40.55 16.84-67.48 16.84-27.33 0-49.99-4.83-67.94-14.52-17.92-9.74-32.49-25.07-43.62-46.06-11.13-20.92-16.72-47.19-16.72-78.74zm74.89.19c0 27.21 4.57 46.81 13.68 58.68 9.13 11.88 21.57 17.85 37.26 17.85 16.1 0 28.65-5.84 37.45-17.47 8.87-11.68 13.28-32.54 13.28-62.77 0-25.39-4.63-43.92-13.84-55.61-9.26-11.76-21.75-17.6-37.56-17.6-15.13 0-27.34 5.97-36.49 17.85-9.21 11.88-13.78 31.61-13.78 59.07zm209.08-135.36h69.99l90.98 149.05V735.91h70.83v269.96h-70.83l-90.48-148.24v148.24h-70.49V735.91zm67.71-117.47h178.37c45.1 0 82 37.04 82 82v340.91c0 44.96-37.03 81.99-82 81.99h-178.37v147c0 17.5-6.99 32.99-18.5 44.5-11.5 11.49-27 18.5-44.5 18.5H62.97c-17.5 0-32.99-7-44.5-18.5-11.49-11.5-18.5-27-18.5-44.5V63.49c0-17.5 7-33 18.5-44.5S45.97.49 62.97.49H700.1c1.5-.5 3-.5 4.5-.5 7 0 14 3 19 7.49h1c1 .5 1.5 1 2.5 2l325.46 329.47c5.5 5.5 9.5 13 9.5 21.5 0 2.5-.5 4.5-1 7v250.98zM732.61 303.47V96.99l232.48 235.47H761.6c-7.99 0-14.99-3.5-20.5-8.49-4.99-5-8.49-12.5-8.49-20.5z'

const SHAPES: Array<{ v: DotShape; label: string; icon: React.ReactNode; viewBox?: string }> = [
  { v: 'circle', label: 'Círculo', icon: <circle cx="12" cy="12" r="6" fill="currentColor" /> },
  { v: 'triangle', label: 'Triángulo', icon: <path d="M18 12L7 5.5v13z" fill="currentColor" /> },
  { v: 'diamond', label: 'Rombo', icon: <path d="M12 4l7 8-7 8-7-8z" fill="currentColor" /> },
  {
    v: 'json', label: 'JSON', viewBox: '0 0 1321.45 1333.33',
    icon: <path d={JSON_ICON_D} fill="currentColor" fillRule="evenodd" clipRule="evenodd" />,
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
          className={open === 'flow' ? 'toggled' : ''} aria-label="Animación" title="Animación (activo, forma, tamaño, velocidad, color)"
          onClick={() => setOpen(open === 'flow' ? null : 'flow')}
        >
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M3 12h4M17 12h4" /></svg>
        </button>
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
          <SwitchRow label="Activo" checked={edge.animated} onChange={v => commit({ animated: v })} />
          <div className="style-section-head">Forma del flujo</div>
          <div className="flow-shape-grid">
            {SHAPES.map(s => (
              <button
                key={s.v}
                className={dotShape === s.v ? 'toggled' : ''}
                aria-label={s.label} title={s.label}
                onClick={() => commit({ dotShape: s.v, animated: true })}
              >
                <svg viewBox={s.viewBox ?? '0 0 24 24'}>{s.icon}</svg>
              </button>
            ))}
          </div>
          <SliderRow
            label="Tamaño" value={dotSize} min={3} max={14} step={1}
            onDragStart={beginDrag} onChange={v => live({ dotSize: v, animated: true })}
          />
          <SliderRow
            label="Velocidad" value={dotSpeed} min={0.05} max={2} step={0.05} valueLabel={dotSpeed.toFixed(2) + 'x'}
            onDragStart={beginDrag} onChange={v => live({ dotSpeed: v, animated: true })}
          />
          <ColorSection value={dotColor} onChange={c => commit({ dotColor: c, animated: true })} recentColors={recentColors} />
        </div>
      )}
    </div>
  )
}
