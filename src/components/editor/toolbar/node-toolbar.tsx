import { useRef, useState } from 'react'
import { useEditorStore } from '../../../lib/stores/editor-store'
import { useClickOutside } from '../../../hooks/use-click-outside'
import { ColorSection, LineStyleTabs, SliderRow } from './style-popover'
import type { Node } from '../../../canvas/types'

type PopoverKind = 'border' | 'fill' | 'color' | 'opacity'

const PLAIN_SHAPES = new Set(['rect', 'cylinder', 'diamond', 'circle', 'hex'])

export function NodeToolbar({ node }: { node: Node }) {
  const engine = useEditorStore(s => s.engine)
  const [open, setOpen] = useState<PopoverKind | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(null))

  const commit = (p: Partial<Node>): void => engine.updateNode(node.id, p)
  // Los sliders disparan onChange en cada paso del arrastre: un solo pushUndo
  // al iniciar el gesto, luego mutación directa para no inundar el historial.
  const beginDrag = (): void => engine.sel.pushUndo()
  const live = (p: Partial<Node>): void => {
    Object.assign(node, p)
    engine.state.scheduleAutosave()
    engine.notify()
  }

  const opacityPct = Math.round((node.opacity ?? 1) * 100)
  const fillOpacityPct = Math.round((node.fillOpacity ?? 1) * 100)
  const isShape = PLAIN_SHAPES.has(node.shape)
  const isTintable = node.shape === 'text' || node.shape === 'icon'
  const canPulse = node.shape !== 'text'

  return (
    <div className="sel-toolbar" ref={ref}>
      <div className="sel-toolbar-row">
        {canPulse && (
          <button
            className={node.pulse ? 'toggled' : ''} aria-label="Pulso" title="Pulso"
            onClick={() => commit({ pulse: !node.pulse })}
          >
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2.6" /><circle cx="12" cy="12" r="8" opacity="0.5" /></svg>
          </button>
        )}
        {isShape && (
          <button
            className={open === 'border' ? 'toggled' : ''} aria-label="Borde" title="Borde"
            onClick={() => setOpen(open === 'border' ? null : 'border')}
          >
            <svg viewBox="0 0 24 24"><path d="M3 17l4 4L21 7l-4-4z" /></svg>
          </button>
        )}
        {isShape && (
          <button
            className={open === 'fill' ? 'toggled' : ''} aria-label="Relleno" title="Relleno"
            onClick={() => setOpen(open === 'fill' ? null : 'fill')}
          >
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /></svg>
          </button>
        )}
        {isTintable && (
          <button
            className={open === 'color' ? 'toggled' : ''} aria-label="Color" title="Color"
            onClick={() => setOpen(open === 'color' ? null : 'color')}
          >
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /></svg>
          </button>
        )}
        {node.shape === 'image' && (
          <button
            className={open === 'opacity' ? 'toggled' : ''} aria-label="Opacidad" title="Opacidad"
            onClick={() => setOpen(open === 'opacity' ? null : 'opacity')}
          >
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" /><rect x="13" y="13" width="8" height="8" /></svg>
          </button>
        )}
        <div className="sel-toolbar-sep" />
        <button aria-label="Duplicar" title="Duplicar (Ctrl+D)" onClick={() => engine.sel.dupSel()}>
          <svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></svg>
        </button>
        <button aria-label="Eliminar" title="Eliminar (Supr)" onClick={() => engine.sel.deleteSel()}>
          <svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
        </button>
      </div>

      {open === 'border' && (
        <div className="sel-popover">
          <LineStyleTabs value={node.lineStyle ?? 'solid'} onChange={v => commit({ lineStyle: v })} />
          <SliderRow
            label="Grosor" value={node.borderWidth ?? 2.5} min={1} max={12} step={0.5}
            onDragStart={beginDrag} onChange={v => live({ borderWidth: v })}
          />
          <SliderRow
            label="Opacidad" value={opacityPct} min={0} max={100} step={5} valueLabel={`${opacityPct}%`}
            onDragStart={beginDrag} onChange={v => live({ opacity: v / 100 })}
          />
          <ColorSection value={node.color} onChange={c => commit({ color: c })} />
        </div>
      )}
      {open === 'fill' && (
        <div className="sel-popover">
          <SliderRow
            label="Opacidad" value={fillOpacityPct} min={0} max={100} step={5} valueLabel={`${fillOpacityPct}%`}
            onDragStart={beginDrag} onChange={v => live({ fillOpacity: v / 100 })}
          />
          <button
            className={'no-fill-btn' + (!node.fill ? ' toggled' : '')}
            onClick={() => commit({ fill: null })}
          >
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M6 18L18 6" /></svg>
            Sin relleno
          </button>
          <ColorSection value={node.fill ?? ''} onChange={c => commit({ fill: c })} />
        </div>
      )}
      {open === 'color' && (
        <div className="sel-popover">
          <ColorSection value={node.color} onChange={c => commit({ color: c })} />
        </div>
      )}
      {open === 'opacity' && (
        <div className="sel-popover">
          <SliderRow
            label="Opacidad" value={opacityPct} min={0} max={100} step={5} valueLabel={`${opacityPct}%`}
            onDragStart={beginDrag} onChange={v => live({ opacity: v / 100 })}
          />
        </div>
      )}
    </div>
  )
}
