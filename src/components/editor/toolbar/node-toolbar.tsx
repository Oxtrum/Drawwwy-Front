import { useRef, useState } from 'react'
import { useEditorStore } from '../../../lib/stores/editor-store'
import { useClickOutside } from '../../../hooks/use-click-outside'
import { FONT_SANS, TEXT_FONTS } from '../../../canvas/config'
import { ColorSection, LineStyleTabs, SliderRow, SwitchRow } from './style-popover'
import type { Node } from '../../../canvas/types'

type PopoverKind = 'border' | 'fill' | 'color' | 'opacity' | 'pulse' | 'text'
type Align = 'left' | 'center' | 'right'

const PLAIN_SHAPES = new Set(['rect', 'cylinder', 'diamond', 'circle', 'hex'])

const ALIGN_ICONS: Record<Align, React.ReactNode> = {
  left: <><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="14" y2="12" /><line x1="4" y1="18" x2="17" y2="18" /></>,
  center: <><line x1="4" y1="6" x2="20" y2="6" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="5.5" y1="18" x2="18.5" y2="18" /></>,
  right: <><line x1="4" y1="6" x2="20" y2="6" /><line x1="10" y1="12" x2="20" y2="12" /><line x1="7" y1="18" x2="20" y2="18" /></>,
}

function PaintBucketIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M19 11 11 3 3.6 10.4a2 2 0 0 0 0 2.8l7.2 7.2a2 2 0 0 0 2.8 0L19 14" />
      <path d="M2 12h13" />
      <path d="M6 3l4 4" />
    </svg>
  )
}

export function NodeToolbar({ node }: { node: Node }) {
  const engine = useEditorStore(s => s.engine)
  const [open, setOpen] = useState<PopoverKind | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  useClickOutside(ref, () => setOpen(null))

  const recentColors = engine.state.usedColors()
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
  const pulseSpeed = node.pulseSpeed ?? engine.state.settings.speed
  const isShape = PLAIN_SHAPES.has(node.shape)
  const isImage = node.shape === 'image'
  const isText = node.shape === 'text'
  const isIconShape = node.shape === 'icon'
  const canPulse = node.shape !== 'text'

  return (
    <div className="sel-toolbar" ref={ref}>
      <div className="sel-toolbar-row">
        {canPulse && (
          <button
            className={open === 'pulse' ? 'toggled' : ''} aria-label="Pulso" title="Pulso"
            onClick={() => setOpen(open === 'pulse' ? null : 'pulse')}
          >
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2.6" /><circle cx="12" cy="12" r="8" opacity="0.5" /></svg>
          </button>
        )}
        {(isShape || isImage) && (
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
            <PaintBucketIcon />
          </button>
        )}
        {isIconShape && (
          <button
            className={open === 'color' ? 'toggled' : ''} aria-label="Color" title="Color"
            onClick={() => setOpen(open === 'color' ? null : 'color')}
          >
            <PaintBucketIcon />
          </button>
        )}
        {isText && (
          <button
            className={open === 'text' ? 'toggled' : ''} aria-label="Texto" title="Texto (tamaño, negrilla, fuente, alineación, color)"
            onClick={() => setOpen(open === 'text' ? null : 'text')}
          >
            <svg viewBox="0 0 24 24"><path d="M5 6h14M12 6v13" /></svg>
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
          {isImage && (
            <button
              className={'no-fill-btn' + (!node.imgBorder ? ' toggled' : '')}
              onClick={() => commit({ imgBorder: false })}
            >
              <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M6 18L18 6" /></svg>
              Sin borde
            </button>
          )}
          <LineStyleTabs value={node.lineStyle ?? 'solid'} onChange={v => commit({ lineStyle: v, imgBorder: true })} />
          <SliderRow
            label="Grosor" value={node.borderWidth ?? 2.5} min={1} max={12} step={0.5}
            onDragStart={beginDrag} onChange={v => live({ borderWidth: v, imgBorder: true })}
          />
          <SliderRow
            label="Opacidad" value={opacityPct} min={0} max={100} step={5} valueLabel={`${opacityPct}%`}
            onDragStart={beginDrag} onChange={v => live({ opacity: v / 100 })}
          />
          <ColorSection value={node.color} onChange={c => commit({ color: c, imgBorder: true })} recentColors={recentColors} />
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
          <ColorSection value={node.fill ?? ''} onChange={c => commit({ fill: c })} recentColors={recentColors} />
        </div>
      )}
      {open === 'color' && (
        <div className="sel-popover">
          <ColorSection value={node.color} onChange={c => commit({ color: c })} recentColors={recentColors} />
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
      {open === 'pulse' && (
        <div className="sel-popover">
          <SwitchRow label="Activo" checked={node.pulse} onChange={v => commit({ pulse: v })} />
          <SliderRow
            label="Tamaño" value={node.pulseSize ?? 18} min={4} max={40} step={1}
            onDragStart={beginDrag} onChange={v => live({ pulseSize: v, pulse: true })}
          />
          <SliderRow
            label="Velocidad" value={pulseSpeed} min={0.05} max={2} step={0.05} valueLabel={pulseSpeed.toFixed(2) + 'x'}
            onDragStart={beginDrag} onChange={v => live({ pulseSpeed: v, pulse: true })}
          />
          <ColorSection value={node.pulseColor || node.color} onChange={c => commit({ pulseColor: c, pulse: true })} recentColors={recentColors} />
        </div>
      )}
      {open === 'text' && (
        <div className="sel-popover">
          <SliderRow
            label="Tamaño" value={node.fs || 22} min={10} max={72} step={1}
            onDragStart={beginDrag} onChange={v => live({ fs: v })}
          />
          <button
            className={'no-fill-btn' + (node.bold ? ' toggled' : '')}
            onClick={() => commit({ bold: !node.bold })}
          >
            <svg viewBox="0 0 24 24"><path d="M7 5h6a4 4 0 0 1 0 8H7zM7 13h7a4 4 0 0 1 0 8H7z" fill="currentColor" stroke="none" /></svg>
            Negrilla
          </button>
          <div className="style-section-head">Fuente</div>
          <div className="tab-row">
            {TEXT_FONTS.map(f => (
              <button
                key={f.family}
                className={(node.font || FONT_SANS) === f.family ? 'toggled' : ''}
                onClick={() => commit({ font: f.family })}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="style-section-head">Alineación</div>
          <div className="tab-row">
            {(['left', 'center', 'right'] as Align[]).map(a => (
              <button
                key={a}
                className={(node.align || 'center') === a ? 'toggled' : ''}
                aria-label={a} title={a}
                onClick={() => commit({ align: a })}
              >
                <svg viewBox="0 0 24 24">{ALIGN_ICONS[a]}</svg>
              </button>
            ))}
          </div>
          <ColorSection value={node.color} onChange={c => commit({ color: c })} recentColors={recentColors} />
        </div>
      )}
    </div>
  )
}
