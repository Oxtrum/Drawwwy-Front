import { useEffect, useRef } from 'react'
import { useEditorStore } from '../../../lib/stores/editor-store'
import { edgePoints, pointAt } from '../../../canvas/geometry'
import { NodeToolbar } from './node-toolbar'
import { EdgeToolbar } from './edge-toolbar'
import type { CanvasEngine } from '../../../canvas/engine'

const MARGIN = 22

function worldAnchor(engine: CanvasEngine): { x: number; y: number } | null {
  const { selN, selE } = engine.sel
  if (selN.size + selE.size === 0) return null

  const single = engine.sel.singleSel()
  if (single) {
    if (single.type === 'node') {
      const n = single.obj
      return { x: n.x, y: n.y - n.h / 2 - MARGIN }
    }
    const pts = edgePoints(single.obj, id => engine.state.nodeById(id))
    if (pts.length < 2) return null
    const m = pointAt(pts, 0.5)
    return { x: m.x, y: m.y - MARGIN }
  }

  const page = engine.state.currentPage()
  let minX = Infinity, minY = Infinity, maxX = -Infinity
  page.nodes.forEach(n => {
    if (!selN.has(n.id)) return
    minX = Math.min(minX, n.x - n.w / 2)
    maxX = Math.max(maxX, n.x + n.w / 2)
    minY = Math.min(minY, n.y - n.h / 2)
  })
  if (minX === Infinity) return null
  return { x: (minX + maxX) / 2, y: minY - MARGIN }
}

function MultiToolbar({ count }: { count: number }) {
  const engine = useEditorStore(s => s.engine)
  return (
    <div className="sel-toolbar">
      <div className="sel-toolbar-row">
        <span className="sel-count">{count} elementos</span>
        <div className="sel-toolbar-sep" />
        <button aria-label="Duplicar" title="Duplicar (Ctrl+D)" onClick={() => engine.sel.dupSel()}>
          <svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></svg>
        </button>
        <button aria-label="Eliminar" title="Eliminar (Supr)" onClick={() => engine.sel.deleteSel()}>
          <svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
        </button>
      </div>
    </div>
  )
}

export function SelectionToolbar() {
  const engine = useEditorStore(s => s.engine)
  useEditorStore(s => s.version)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    const tick = (): void => {
      const el = wrapRef.current
      if (el) {
        const busy = !!(engine.drag || engine.resizing || engine.panDrag || engine.marquee || engine.editing)
        const anchor = busy ? null : worldAnchor(engine)
        if (anchor) {
          const sx = anchor.x * engine.viewZoom + engine.viewX
          const sy = anchor.y * engine.viewZoom + engine.viewY
          el.style.visibility = 'visible'
          el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -100%)`
        } else {
          el.style.visibility = 'hidden'
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [engine])

  const single = engine.sel.singleSel()
  const count = engine.sel.selN.size + engine.sel.selE.size
  if (count === 0) return null

  return (
    <div className="sel-toolbar-wrap" ref={wrapRef}>
      {single
        ? single.type === 'node'
          ? <NodeToolbar key={single.obj.id} node={single.obj} />
          : <EdgeToolbar key={single.obj.id} edge={single.obj} />
        : <MultiToolbar count={count} />}
    </div>
  )
}
