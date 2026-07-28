'use strict'

import { ARROW_OFF, DIR, ICONS, SIDES, W, H } from './config'
import { edgePoints, nearestAnchorSide, placementBounds, pointAt, sideOfPoint, sidePoint } from './geometry'
import { nodeCorners, normRect } from './render'
import { DocumentState } from './state'
import { CLIP_PREFIX } from './selection'
import type { Edge, Node, Point, Side } from './types'
import type { CanvasEngine } from './engine'

export function toWorld(eng: CanvasEngine, ev: { clientX: number; clientY: number }): Point {
  const cv = eng.canvas
  if (!cv) return { x: 0, y: 0 }
  const r = cv.getBoundingClientRect()
  const screenX = ev.clientX - r.left
  const screenY = ev.clientY - r.top
  return { x: (screenX - eng.viewX) / eng.viewZoom, y: (screenY - eng.viewY) / eng.viewZoom }
}

export function hitNode(eng: CanvasEngine, x: number, y: number): Node | null {
  const ns = eng.state.currentPage().nodes
  for (let i = ns.length - 1; i >= 0; i--) {
    const n = ns[i]
    if (Math.abs(x - n.x) <= n.w / 2 + 4 && Math.abs(y - n.y) <= n.h / 2 + 4) return n
  }
  return null
}

export function hitEdge(eng: CanvasEngine, x: number, y: number): Edge | null {
  const es = eng.state.currentPage().edges
  for (let i = es.length - 1; i >= 0; i--) {
    const pts = edgePoints(es[i], id => eng.state.nodeById(id))
    for (let j = 1; j < pts.length; j++) {
      const p1 = pts[j - 1]
      const p2 = pts[j]
      const L2 = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2
      if (L2 === 0) continue
      let u = ((x - p1.x) * (p2.x - p1.x) + (y - p1.y) * (p2.y - p1.y)) / L2
      u = DocumentState.clamp(u, 0, 1)
      const d = Math.hypot(x - (p1.x + u * (p2.x - p1.x)), y - (p1.y + u * (p2.y - p1.y)))
      if (d < 8) return es[i]
    }
  }
  return null
}

export function hitSideArrow(n: Node | null, x: number, y: number): Side | null {
  if (!n) return null
  for (const s of SIDES) {
    const p = sidePoint(n, s)
    const d = DIR[s]
    if (Math.hypot(x - (p.x + d.x * ARROW_OFF), y - (p.y + d.y * ARROW_OFF)) < 14) return s
  }
  return null
}

export function hitCorner(n: Node | null, x: number, y: number): number {
  if (!n) return -1
  const cs = nodeCorners(n)
  for (let i = 0; i < 4; i++) if (Math.hypot(x - cs[i][0], y - cs[i][1]) < 10) return i
  return -1
}

export function hitWaypoint(e: Edge, x: number, y: number): number {
  const wps = e.waypoints || []
  for (let i = 0; i < wps.length; i++) if (Math.hypot(x - wps[i].x, y - wps[i].y) < 10) return i
  return -1
}

export function hitMidpoint(eng: CanvasEngine, e: Edge, x: number, y: number): number {
  const pts = edgePoints(e, id => eng.state.nodeById(id))
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i - 1].x + pts[i].x) / 2
    const my = (pts[i - 1].y + pts[i].y) / 2
    if (Math.hypot(x - mx, y - my) < 9) return i - 1
  }
  return -1
}

export function addImageFromBlob(eng: CanvasEngine, blob: Blob, x = W / 2, y = H / 2): void {
  const fr = new FileReader()
  fr.onload = () => {
    const url = String(fr.result)
    const im = new Image()
    im.onload = () => {
      eng.sel.pushUndo()
      const maxD = 320
      const sc = Math.min(1, maxD / Math.max(im.naturalWidth, im.naturalHeight))
      const n = eng.state.newNode('image', x, y, {
        img: url,
        w: Math.round(im.naturalWidth * sc),
        h: Math.round(im.naturalHeight * sc),
      })
      eng.sel.selectOnly('node', n.id)
    }
    im.src = url
  }
  fr.readAsDataURL(blob)
}

/** Lee el portapapeles del sistema con la Clipboard API (requiere gesto del
 *  usuario: click de menú o tecla). Cubre lo que el evento pasivo `paste` del
 *  DOM no puede: pegar una imagen externa desde el menú contextual, donde
 *  hacer click en "Pegar" nunca dispara un evento `paste` real. Devuelve
 *  `true` si encontró algo pegable (imagen o el clip interno serializado). */
export async function pasteFromSystemClipboard(eng: CanvasEngine, x: number, y: number): Promise<boolean> {
  try {
    const items = await navigator.clipboard?.read?.()
    if (!items) return false
    for (const item of items) {
      const imgType = item.types.find(t => t.startsWith('image/'))
      if (imgType) {
        addImageFromBlob(eng, await item.getType(imgType), x, y)
        return true
      }
    }
    for (const item of items) {
      if (!item.types.includes('text/plain')) continue
      const txt = await (await item.getType('text/plain')).text()
      if (!txt.startsWith(CLIP_PREFIX)) continue
      try { eng.sel.clip = JSON.parse(txt.slice(CLIP_PREFIX.length)) } catch { continue }
      eng.sel.pasteClip()
      eng.notify()
      return true
    }
  } catch {
    // Sin permiso de portapapeles (o vacío): quien llama cae al clip interno.
  }
  return false
}

export function attachInteraction(eng: CanvasEngine): () => void {
  const cv = eng.canvas
  if (!cv) return () => {}

  let shiftHeld = false

  const onContextMenu = (ev: MouseEvent): void => {
    ev.preventDefault()
  }

  const onPointerDown = (ev: PointerEvent): void => {
    if (ev.button === 1 || ev.button === 2 || (ev.button === 0 && (ev.altKey || eng.mode === 'hand'))) {
      if (ev.button !== 2) ev.preventDefault()
      eng.panDrag = { x: ev.clientX, y: ev.clientY, startX: eng.viewX, startY: eng.viewY, isRight: ev.button === 2, moved: false }
      cv.setPointerCapture(ev.pointerId)
      if (ev.button !== 2) cv.style.cursor = 'grabbing'
      return
    }
    if (ev.button !== 0) return

    ev.preventDefault()
    const p = toWorld(eng, ev)
    eng.mouse.x = p.x
    eng.mouse.y = p.y
    eng.commitEdit()
    cv.setPointerCapture(ev.pointerId)

    if (eng.pendingShape || eng.pendingIcon) {
      // Esperamos hasta pointerup para distinguir un click de un click-arrastre.
      // En el segundo caso, `start` y `current` son las esquinas opuestas del nodo.
      eng.placement = {
        shape: eng.pendingShape,
        icon: eng.pendingIcon,
        start: { ...p },
        current: { ...p },
      }
      return
    }

    const n = hitNode(eng, p.x, p.y)

    if (eng.mode === 'connect') {
      if (n) {
        if (eng.connecting === null) eng.connecting = n.id
        else {
          eng.sel.pushUndo()
          const e = eng.state.newEdge(eng.connecting, n.id)
          eng.connecting = null
          if (e) eng.sel.selectOnly('edge', e.id)
        }
      } else eng.connecting = null
      eng.notify()
      return
    }

    const single = eng.sel.singleSel()
    if (single && single.type === 'node' && single.obj) {
      const sn = single.obj as Node
      const ci = hitCorner(sn, p.x, p.y)
      if (ci >= 0) {
        eng.sel.pushUndo()
        eng.resizing = {
          id: sn.id,
          fx: sn.x + (ci === 0 || ci === 3 ? sn.w / 2 : -sn.w / 2),
          fy: sn.y + (ci <= 1 ? sn.h / 2 : -sn.h / 2),
          aspect: (sn.shape === 'image' || sn.shape === 'icon') ? sn.w / sn.h : null,
        }
        return
      }
    }
    if (single && single.type === 'edge' && single.obj) {
      const se = single.obj as Edge
      const wi = hitWaypoint(se, p.x, p.y)
      if (wi >= 0) { eng.sel.pushUndo(); eng.wpDrag = { edgeId: se.id, idx: wi }; return }
      const mi = hitMidpoint(eng, se, p.x, p.y)
      if (mi >= 0) {
        eng.sel.pushUndo()
        if (se.route === 'ortho' && (se.waypoints || []).length === 0) {
          const pts = edgePoints(se, id => eng.state.nodeById(id))
          se.waypoints = pts.slice(1, -1).map(q => ({ x: q.x, y: q.y }))
        }
        se.waypoints.splice(mi, 0, { x: p.x, y: p.y })
        eng.wpDrag = { edgeId: se.id, idx: mi }
        return
      }
    }

    const arrowSide = hitSideArrow(eng.hoverNode, p.x, p.y)
    if (arrowSide && eng.hoverNode) {
      eng.connectDrag = { fromId: eng.hoverNode.id, fromSide: arrowSide }
      return
    }

    if (n) {
      if (ev.shiftKey) { eng.sel.toggleSel('node', n.id); return }
      if (!eng.sel.selN.has(n.id)) eng.sel.selectOnly('node', n.id)
      eng.sel.pushUndo()
      eng.drag = { offs: {}, wps: [] }
      for (const id of eng.sel.selN) {
        const nn = eng.state.nodeById(id)
        if (nn) eng.drag.offs[id] = { dx: p.x - nn.x, dy: p.y - nn.y }
      }
      for (const e of eng.state.currentPage().edges) {
        if (eng.sel.selN.has(e.from) && eng.sel.selN.has(e.to)) {
          (e.waypoints || []).forEach(w => eng.drag!.wps.push({ w, dx: p.x - w.x, dy: p.y - w.y }))
        } else if ((eng.sel.selN.has(e.from) || eng.sel.selN.has(e.to)) && (e.waypoints || []).length) {
          const pts = edgePoints(e, id => eng.state.nodeById(id))
          if (pts.length > 1) {
            const A2 = eng.state.nodeById(e.from)
            const B2 = eng.state.nodeById(e.to)
            if (A2 && !e.fromSide) e.fromSide = sideOfPoint(A2, pts[0])
            if (B2 && !e.toSide) e.toSide = sideOfPoint(B2, pts[pts.length - 1])
          }
          e.waypoints = []
          e.route = 'ortho'
        }
      }
      return
    }

    const e = hitEdge(eng, p.x, p.y)
    if (e) {
      if (ev.shiftKey) eng.sel.toggleSel('edge', e.id)
      else eng.sel.selectOnly('edge', e.id)
      return
    }

    eng.marquee = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, add: ev.shiftKey }
  }

  const onPointerMove = (ev: PointerEvent): void => {
    if (eng.panDrag) {
      const dx = ev.clientX - eng.panDrag.x
      const dy = ev.clientY - eng.panDrag.y
      if (!eng.panDrag.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        eng.panDrag.moved = true
        cv.style.cursor = 'grabbing'
      }
      eng.viewX = eng.panDrag.startX + dx
      eng.viewY = eng.panDrag.startY + dy
      return
    }
    const p = toWorld(eng, ev)
    eng.mouse.x = p.x
    eng.mouse.y = p.y
    if (eng.placement) {
      eng.placement.current = { ...p }
      return
    }
    if (eng.marquee) { eng.marquee.x1 = p.x; eng.marquee.y1 = p.y; return }
    if (eng.drag) {
      for (const id in eng.drag.offs) {
        const nn = eng.state.nodeById(+id)
        if (nn) {
          nn.x = DocumentState.snap(p.x - eng.drag.offs[id].dx)
          nn.y = DocumentState.snap(p.y - eng.drag.offs[id].dy)
        }
      }
      eng.drag.wps.forEach(o => { o.w.x = DocumentState.snap(p.x - o.dx); o.w.y = DocumentState.snap(p.y - o.dy) })
      return
    }
    if (eng.resizing) {
      const n = eng.state.nodeById(eng.resizing.id)
      if (n) {
        let w = Math.max(40, Math.abs(p.x - eng.resizing.fx) - 6)
        let h = Math.max(30, Math.abs(p.y - eng.resizing.fy) - 6)
        if (eng.resizing.aspect) {
          if (w / eng.resizing.aspect > h) h = w / eng.resizing.aspect
          else w = h * eng.resizing.aspect
        }
        n.w = Math.round(w); n.h = Math.round(h)
        n.x = Math.round((p.x + eng.resizing.fx) / 2)
        n.y = Math.round((p.y + eng.resizing.fy) / 2)
      }
      return
    }
    if (eng.wpDrag) {
      const e = eng.state.edgeById(eng.wpDrag.edgeId)
      if (e && e.waypoints[eng.wpDrag.idx]) {
        e.waypoints[eng.wpDrag.idx].x = DocumentState.snap(p.x)
        e.waypoints[eng.wpDrag.idx].y = DocumentState.snap(p.y)
      }
      return
    }
    if (eng.mode === 'hand') { cv.style.cursor = 'grab'; return }
    eng.hoverNode = null
    const ns = eng.state.currentPage().nodes
    for (let i = ns.length - 1; i >= 0; i--) {
      if (hitSideArrow(ns[i], p.x, p.y)) { eng.hoverNode = ns[i]; break }
    }
    if (!eng.hoverNode) eng.hoverNode = hitNode(eng, p.x, p.y)
    const single = eng.sel.singleSel()
    let cur = 'default'
    if (eng.pendingShape || eng.pendingIcon || eng.mode === 'connect' || eng.connectDrag) cur = 'crosshair'
    else if (single && single.type === 'node' && single.obj && hitCorner(single.obj as Node, p.x, p.y) >= 0) cur = 'nwse-resize'
    else if (eng.hoverNode && hitSideArrow(eng.hoverNode, p.x, p.y)) cur = 'crosshair'
    else if (eng.hoverNode) cur = 'grab'
    cv.style.cursor = cur
  }

  const onPointerUp = (ev: PointerEvent): void => {
    if (eng.panDrag) {
      if (eng.panDrag.isRight && !eng.panDrag.moved) {
        const p = toWorld(eng, ev)
        const n = hitNode(eng, p.x, p.y)
        const e = !n ? hitEdge(eng, p.x, p.y) : null
        if (n) {
          if (!eng.sel.selN.has(n.id)) eng.sel.selectOnly('node', n.id)
        } else if (e) {
          if (!eng.sel.selE.has(e.id)) eng.sel.selectOnly('edge', e.id)
        } else {
          eng.sel.clearSel()
        }
        eng.openContextMenu(ev.clientX, ev.clientY)
        cv.style.cursor = 'default'
      }
      eng.panDrag = null
      return
    }
    const p = toWorld(eng, ev)
    const hadDrag = !!(eng.drag || eng.resizing || eng.wpDrag || eng.placement)
    if (eng.placement) {
      const placement = eng.placement
      const dx = placement.current.x - placement.start.x
      const dy = placement.current.y - placement.start.y
      const dragged = Math.hypot(dx, dy) > 6 / eng.viewZoom

      eng.sel.pushUndo()
      let n: Node
      if (placement.icon) {
        n = eng.state.newNode('icon', placement.start.x, placement.start.y, {
          icon: placement.icon,
          label: ICONS[placement.icon].n,
        })
      } else {
        n = eng.state.newNode(placement.shape!, placement.start.x, placement.start.y)
      }

      if (dragged) {
        const b = placementBounds(placement.start, placement.current, n.shape)
        n.x = DocumentState.snap(b.x + b.w / 2)
        n.y = DocumentState.snap(b.y + b.h / 2)
        n.w = b.w
        n.h = b.h
      }

      eng.sel.selectOnly('node', n.id)
      eng.pendingShape = null
      eng.pendingIcon = null
      eng.placement = null
    }
    if (eng.connectDrag) {
      const tgt = hitNode(eng, p.x, p.y)
      if (tgt) {
        eng.sel.pushUndo()
        const isSelf = tgt.id === eng.connectDrag.fromId
        const snapSide = isSelf ? eng.connectDrag.fromSide : nearestAnchorSide(tgt, p, 22)
        const e = eng.state.newEdge(eng.connectDrag.fromId, tgt.id, {
          fromSide: eng.connectDrag.fromSide,
          toSide: snapSide,
          route: 'ortho',
        })
        if (e) eng.sel.selectOnly('edge', e.id)
      }
      eng.connectDrag = null
    }
    if (eng.marquee) {
      const r = normRect(eng.marquee)
      if (r.w > 6 || r.h > 6) {
        if (!eng.marquee.add) { eng.sel.selN.clear(); eng.sel.selE.clear() }
        for (const nd of eng.state.currentPage().nodes) {
          if (nd.x + nd.w / 2 >= r.x && nd.x - nd.w / 2 <= r.x + r.w &&
              nd.y + nd.h / 2 >= r.y && nd.y - nd.h / 2 <= r.y + r.h) eng.sel.selN.add(nd.id)
        }
        for (const e of eng.state.currentPage().edges) {
          const m = pointAt(edgePoints(e, id => eng.state.nodeById(id)), 0.5)
          const inside = m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h
          if (inside || (eng.sel.selN.has(e.from) && eng.sel.selN.has(e.to))) eng.sel.selE.add(e.id)
        }
        eng.notify()
      } else if (!eng.marquee.add) {
        eng.sel.clearSel()
      }
      eng.marquee = null
    }
    eng.drag = null
    eng.placement = null
    eng.resizing = null
    eng.wpDrag = null
    if (hadDrag) eng.state.scheduleAutosave()
    eng.notify()
  }

  const onDblClick = (ev: MouseEvent): void => {
    const p = toWorld(eng, ev)
    const single = eng.sel.singleSel()
    if (single && single.type === 'edge' && single.obj) {
      const se = single.obj as Edge
      const wi = hitWaypoint(se, p.x, p.y)
      if (wi >= 0) { eng.sel.pushUndo(); se.waypoints.splice(wi, 1); return }
    }
    const tgt = hitNode(eng, p.x, p.y) || hitEdge(eng, p.x, p.y)
    if (!tgt) return
    eng.beginEdit(tgt)
  }

  const onKeyDown = (ev: KeyboardEvent): void => {
    const tag = (ev.target as HTMLElement | null)?.tagName
    if (tag === 'TEXTAREA' || tag === 'INPUT') return
    const k = ev.key.toLowerCase()
    const ctl = ev.ctrlKey || ev.metaKey
    if (ctl && k === 'z') { ev.preventDefault(); if (ev.shiftKey) eng.sel.redo(); else eng.sel.undo(); eng.notify(); return }
    if (ctl && k === 'y') { ev.preventDefault(); eng.sel.redo(); eng.notify(); return }
    if (ctl && k === 'c') { eng.sel.copySel(); return }
    if (ctl && k === 'x') { eng.sel.cutSel(); eng.notify(); return }
    if (ctl && k === 'a') { ev.preventDefault(); eng.sel.selectAll(); return }
    if (ctl && k === 'd') { ev.preventDefault(); eng.sel.dupSel(); eng.notify(); return }
    if (ctl && k === 'v') {
      if (eng.pasteTimer !== null) clearTimeout(eng.pasteTimer)
      eng.pasteTimer = setTimeout(() => {
        pasteFromSystemClipboard(eng, eng.mouse.x, eng.mouse.y).then(ok => {
          if (!ok && eng.sel.clip) { eng.sel.pasteClip(); eng.notify() }
        })
      }, 140)
      return
    }
    if (ev.key === 'Delete' || ev.key === 'Backspace') { eng.sel.deleteSel(); eng.notify() }
    if (ev.key === 'Escape') {
      eng.pendingShape = null
      eng.pendingIcon = null
      eng.connecting = null
      eng.connectDrag = null
      eng.marquee = null
      eng.contextMenu = null
      eng.notify()
    }
    if (k === 'v') eng.setMode(eng.mode === 'hand' ? 'select' : 'hand')
    if (k === 'c') eng.setMode('connect')
    if (ev.key === ' ') { ev.preventDefault(); eng.togglePlay() }
    if (ev.key === 'Shift') shiftHeld = true
  }

  const onKeyUp = (ev: KeyboardEvent): void => {
    if (ev.key === 'Shift') shiftHeld = false
  }

  const onBlur = (): void => { shiftHeld = false }

  const onPaste = (ev: ClipboardEvent): void => {
    const tag = (ev.target as HTMLElement | null)?.tagName
    if (tag === 'TEXTAREA' || tag === 'INPUT') return
    if (eng.pasteTimer !== null) clearTimeout(eng.pasteTimer)
    const txt = ev.clipboardData?.getData('text/plain') || ''
    if (txt.startsWith(CLIP_PREFIX)) {
      try { eng.sel.clip = JSON.parse(txt.slice(CLIP_PREFIX.length)) } catch { /* noop */ }
      eng.sel.pasteClip()
      eng.notify()
      ev.preventDefault()
      return
    }
    for (const it of ev.clipboardData?.items ?? []) {
      if (it.type.startsWith('image/')) {
        const f = it.getAsFile()
        if (f) addImageFromBlob(eng, f)
        ev.preventDefault()
        return
      }
    }
    if (eng.sel.clip) { eng.sel.pasteClip(); eng.notify() }
  }

  const onWheel = (ev: WheelEvent): void => {
    ev.preventDefault()
    if (eng.contextMenu) eng.closeContextMenu()
    if (ev.ctrlKey || ev.metaKey) {
      const r = cv.getBoundingClientRect()
      const screenX = ev.clientX - r.left
      const screenY = ev.clientY - r.top
      const zoomDelta = ev.deltaY > 0 ? 0.9 : 1.1
      const newZoom = DocumentState.clamp(eng.viewZoom * zoomDelta, 0.1, 5)
      const worldX = (screenX - eng.viewX) / eng.viewZoom
      const worldY = (screenY - eng.viewY) / eng.viewZoom
      eng.viewZoom = newZoom
      eng.viewX = screenX - worldX * eng.viewZoom
      eng.viewY = screenY - worldY * eng.viewZoom
      eng.commitEdit()
    } else if (ev.shiftKey || shiftHeld) {
      eng.viewX -= (ev.deltaX !== 0 ? ev.deltaX : ev.deltaY)
      eng.commitEdit()
    } else {
      eng.viewX -= ev.deltaX
      eng.viewY -= ev.deltaY
      eng.commitEdit()
    }
  }

  const onDragOver = (ev: DragEvent): void => ev.preventDefault()

  const onDrop = (ev: DragEvent): void => {
    ev.preventDefault()
    const p = toWorld(eng, ev)
    for (const f of ev.dataTransfer?.files ?? []) {
      if (f.type.startsWith('image/')) { addImageFromBlob(eng, f, p.x, p.y); return }
    }
  }

  cv.addEventListener('contextmenu', onContextMenu)
  cv.addEventListener('pointerdown', onPointerDown)
  cv.addEventListener('pointermove', onPointerMove)
  cv.addEventListener('pointerup', onPointerUp)
  cv.addEventListener('dblclick', onDblClick)
  cv.addEventListener('wheel', onWheel, { passive: false })
  cv.addEventListener('dragover', onDragOver)
  cv.addEventListener('drop', onDrop)
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)
  document.addEventListener('paste', onPaste)

  return () => {
    cv.removeEventListener('contextmenu', onContextMenu)
    cv.removeEventListener('pointerdown', onPointerDown)
    cv.removeEventListener('pointermove', onPointerMove)
    cv.removeEventListener('pointerup', onPointerUp)
    cv.removeEventListener('dblclick', onDblClick)
    cv.removeEventListener('wheel', onWheel)
    cv.removeEventListener('dragover', onDragOver)
    cv.removeEventListener('drop', onDrop)
    document.removeEventListener('keydown', onKeyDown)
    document.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('blur', onBlur)
    document.removeEventListener('paste', onPaste)
  }
}
