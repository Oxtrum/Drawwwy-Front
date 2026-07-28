import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { useEditorStore } from '../../lib/stores/editor-store'
import { useClickOutside } from '../../hooks/use-click-outside'
import type { ArrangeDir } from '../../canvas/selection'
import type { CanvasEngine } from '../../canvas/engine'

function useClampedStyle(ref: RefObject<HTMLDivElement | null>, x: number, y: number): CSSProperties {
  const [pos, setPos] = useState({ left: x, top: y })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const margin = 8
    const left = Math.min(x, Math.max(margin, window.innerWidth - r.width - margin))
    const top = Math.min(y, Math.max(margin, window.innerHeight - r.height - margin))
    setPos({ left, top })
  }, [ref, x, y])

  return { left: pos.left, top: pos.top }
}

function MenuItem(
  { icon, label, shortcut, danger, disabled, onClick }:
  { icon: ReactNode; label: string; shortcut?: string; danger?: boolean; disabled?: boolean; onClick: () => void },
) {
  return (
    <button className={'ctx-item' + (danger ? ' danger' : '')} disabled={disabled} onClick={onClick}>
      <span className="ctx-item-icon">{icon}</span>
      <span className="ctx-item-label">{label}</span>
      {shortcut && <span className="ctx-item-shortcut">{shortcut}</span>}
    </button>
  )
}

const ARRANGE_ITEMS: Array<{ dir: ArrangeDir; label: string; icon: ReactNode }> = [
  {
    dir: 'front', label: 'Traer al frente',
    icon: <svg viewBox="0 0 24 24"><rect x="4" y="4" width="11" height="11" rx="1.5" opacity="0.45" /><rect x="9" y="9" width="11" height="11" rx="1.5" /></svg>,
  },
  {
    dir: 'forward', label: 'Traer adelante',
    icon: <svg viewBox="0 0 24 24"><path d="M12 19V6" /><path d="M6 11l6-6 6 6" /></svg>,
  },
  {
    dir: 'backward', label: 'Enviar atrás',
    icon: <svg viewBox="0 0 24 24"><path d="M12 5v13" /><path d="M18 13l-6 6-6-6" /></svg>,
  },
  {
    dir: 'back', label: 'Enviar al fondo',
    icon: <svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="1.5" opacity="0.45" /><rect x="4" y="4" width="11" height="11" rx="1.5" /></svg>,
  },
]

function ArrangeSubmenu({ engine, parentRef, onDone }: { engine: CanvasEngine; parentRef: React.RefObject<HTMLDivElement | null>; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [side, setSide] = useState<'right' | 'left'>('right')

  useLayoutEffect(() => {
    const el = ref.current
    const parent = parentRef.current
    if (!el || !parent) return
    const pr = parent.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    setSide(pr.right + r.width > window.innerWidth - 8 ? 'left' : 'right')
  }, [parentRef])

  return (
    <div className={'ctx-submenu ctx-submenu-' + side} ref={ref}>
      {ARRANGE_ITEMS.map(it => (
        <MenuItem
          key={it.dir}
          icon={it.icon}
          label={it.label}
          disabled={!engine.sel.canArrange(it.dir)}
          onClick={() => { engine.sel.arrange(it.dir); onDone() }}
        />
      ))}
    </div>
  )
}

function CopyIcon() {
  return <svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
}
function CutIcon() {
  return <svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="2.5" /><circle cx="6" cy="18" r="2.5" /><path d="M8.5 7.5L20 19M20 5L8.5 16.5" /></svg>
}
function PasteIcon() {
  return <svg viewBox="0 0 24 24"><rect x="7" y="3.5" width="10" height="4" rx="1" /><rect x="5" y="6" width="14" height="15" rx="2" /></svg>
}
function DuplicateIcon() {
  return <svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></svg>
}
function DeleteIcon() {
  return <svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
}
function SelectAllIcon() {
  return <svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" strokeDasharray="3,2.5" /></svg>
}
function ArrangeIcon() {
  return <svg viewBox="0 0 24 24"><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /></svg>
}
function ChevronIcon() {
  return <svg viewBox="0 0 24 24" className="ctx-chevron"><path d="M9 6l6 6-6 6" /></svg>
}

export function ContextMenu() {
  const engine = useEditorStore(s => s.engine)
  useEditorStore(s => s.version)
  const menu = engine.contextMenu
  const wrapRef = useRef<HTMLDivElement>(null)
  const arrangeRef = useRef<HTMLDivElement>(null)
  const [arrangeOpen, setArrangeOpen] = useState(false)

  useClickOutside(wrapRef, () => engine.closeContextMenu())
  const style = useClampedStyle(wrapRef, menu?.x ?? 0, menu?.y ?? 0)

  if (!menu) return null

  const close = (): void => { engine.closeContextMenu(); setArrangeOpen(false) }
  const hasSel = engine.sel.selN.size + engine.sel.selE.size > 0
  const hasClip = !!engine.sel.clip

  return (
    <div className="ctx-menu-wrap" ref={wrapRef} style={style}>
      <div className="ctx-menu">
        {hasSel ? (
          <>
            <MenuItem icon={<CopyIcon />} label="Copiar" shortcut="Ctrl+C" onClick={() => { engine.sel.copySel(); close() }} />
            <MenuItem icon={<CutIcon />} label="Cortar" shortcut="Ctrl+X" onClick={() => { engine.sel.cutSel(); engine.notify(); close() }} />
            <MenuItem icon={<PasteIcon />} label="Pegar" shortcut="Ctrl+V" disabled={!hasClip} onClick={() => { engine.sel.pasteClip(); engine.notify(); close() }} />
            <MenuItem icon={<DuplicateIcon />} label="Duplicar" shortcut="Ctrl+D" onClick={() => { engine.sel.dupSel(); engine.notify(); close() }} />
            <MenuItem icon={<DeleteIcon />} label="Eliminar" shortcut="Supr" danger onClick={() => { engine.sel.deleteSel(); engine.notify(); close() }} />
            <div className="ctx-sep" />
            <div className="ctx-item-wrap" ref={arrangeRef}>
              <button
                className={'ctx-item' + (arrangeOpen ? ' toggled' : '')}
                onClick={() => setArrangeOpen(v => !v)}
                onMouseEnter={() => setArrangeOpen(true)}
              >
                <span className="ctx-item-icon"><ArrangeIcon /></span>
                <span className="ctx-item-label">Ordenar</span>
                <ChevronIcon />
              </button>
              {arrangeOpen && <ArrangeSubmenu engine={engine} parentRef={arrangeRef} onDone={close} />}
            </div>
          </>
        ) : (
          <>
            <MenuItem icon={<PasteIcon />} label="Pegar" shortcut="Ctrl+V" disabled={!hasClip} onClick={() => { engine.sel.pasteClip(); engine.notify(); close() }} />
            <MenuItem
              icon={<SelectAllIcon />} label="Seleccionar todo" shortcut="Ctrl+A"
              disabled={!engine.state.currentPage().nodes.length && !engine.state.currentPage().edges.length}
              onClick={() => { engine.sel.selectAll(); close() }}
            />
          </>
        )}
      </div>
    </div>
  )
}
