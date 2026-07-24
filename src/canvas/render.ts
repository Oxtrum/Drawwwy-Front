'use strict'

import { ARROW_OFF, DIR, GRID, HANDLE, SIDES, THEMES, getImg, iconURL } from './config'
import { edgePoints, pointAt, sidePoint, nearestAnchorSide } from './geometry'
import { DocumentState } from './state'
import type { Bounds, Edge, MarqueeState, Node, Settings } from './types'
import type { CanvasEngine } from './engine'

export interface RenderOpts {
  export?: boolean
  bounds?: Bounds
  bg?: string
  transparent?: boolean
}

type Ctx = CanvasRenderingContext2D

export function nodeAlpha(n: Node, t: number, settings: Settings): number {
  if (!settings.build) return 1
  return DocumentState.smooth((t - n.order * settings.stagger) / 0.5)
}

export function buildDuration(nodes: Node[], settings: Settings): number {
  if (!settings.build || !nodes.length) return 0
  const maxO = nodes.reduce((m, n) => Math.max(m, n.order), 0)
  return maxO * settings.stagger + 0.8
}

export function normRect(m: MarqueeState): Bounds {
  return {
    x: Math.min(m.x0, m.x1),
    y: Math.min(m.y0, m.y1),
    w: Math.abs(m.x1 - m.x0),
    h: Math.abs(m.y1 - m.y0),
  }
}

function roundRect(c: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}

export function shapePath(c: Ctx, n: Node): void {
  const { x, y, w, h } = n
  c.beginPath()
  switch (n.shape) {
    case 'circle':
      c.arc(x, y, w / 2, 0, Math.PI * 2)
      break
    case 'diamond':
      c.moveTo(x, y - h / 2); c.lineTo(x + w / 2, y); c.lineTo(x, y + h / 2); c.lineTo(x - w / 2, y); c.closePath()
      break
    case 'hex': {
      const i = Math.min(24, w * 0.18)
      c.moveTo(x - w / 2 + i, y - h / 2); c.lineTo(x + w / 2 - i, y - h / 2); c.lineTo(x + w / 2, y)
      c.lineTo(x + w / 2 - i, y + h / 2); c.lineTo(x - w / 2 + i, y + h / 2); c.lineTo(x - w / 2, y); c.closePath()
      break
    }
    default:
      roundRect(c, x - w / 2, y - h / 2, w, h, 10)
  }
}

function drawLabelLines(c: Ctx, n: Node, theme: string, baseFs: number, cy: number): void {
  const T = THEMES[theme]
  c.fillStyle = n.shape === 'text' ? n.color : T.text
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  const lines = String(n.label).split('\n')
  let fs = n.fs || baseFs
  c.font = `${fs}px Georgia, serif`
  if (!n.fs) {
    const maxW = Math.max(...lines.map(l => c.measureText(l).width), 1)
    const avail = n.w - 18
    if (maxW > avail) {
      fs = Math.max(10, fs * avail / maxW)
      c.font = `${fs}px Georgia, serif`
    }
  }
  const lh = fs * 1.25
  const oy = cy - (lines.length - 1) * lh / 2
  lines.forEach((l, i) => c.fillText(l, n.x, oy + i * lh))
}

export function nodeCorners(n: Node): Array<[number, number]> {
  return [
    [n.x - n.w / 2 - 6, n.y - n.h / 2 - 6],
    [n.x + n.w / 2 + 6, n.y - n.h / 2 - 6],
    [n.x + n.w / 2 + 6, n.y + n.h / 2 + 6],
    [n.x - n.w / 2 - 6, n.y + n.h / 2 + 6],
  ]
}

export function drawNode(c: Ctx, n: Node, t: number, theme: string, isExport: boolean, eng: CanvasEngine): void {
  const settings = eng.state.settings
  const a = nodeAlpha(n, t, settings)
  if (a <= 0) return
  c.save()
  c.globalAlpha = a
  const grow = settings.build ? DocumentState.lerp(0.85, 1, a) : 1
  c.translate(n.x, n.y); c.scale(grow, grow); c.translate(-n.x, -n.y)
  let glow = 0
  if (n.pulse) glow = (Math.sin(t * 2 * Math.PI * Math.max(0.3, settings.speed) * 2) + 1) / 2

  if (n.shape === 'image' && n.img) {
    const im = getImg(n.img)
    if (im.complete && im.naturalWidth) {
      if (glow > 0) { c.shadowColor = '#3aa7e8'; c.shadowBlur = 20 * glow }
      c.drawImage(im, n.x - n.w / 2, n.y - n.h / 2, n.w, n.h)
      c.shadowBlur = 0
    }
    if (n.label) drawLabelLines(c, n, theme, 14, n.y + n.h / 2 + 14)
  } else if (n.shape === 'icon') {
    const im = getImg(iconURL[n.icon ?? ''] || '')
    const s = Math.min(n.w, n.h - 26) * 0.78
    if (glow > 0) { c.shadowColor = n.color; c.shadowBlur = 18 * glow }
    if (im.complete && im.naturalWidth) c.drawImage(im, n.x - s / 2, n.y - n.h / 2 + 4, s, s)
    c.shadowBlur = 0
    if (n.label) drawLabelLines(c, n, theme, 14, n.y + n.h / 2 - 10)
  } else if (n.shape === 'cylinder') {
    const { x, y, w, h } = n
    const ry = Math.min(16, h * 0.18)
    const top = y - h / 2
    const bot = y + h / 2
    c.fillStyle = DocumentState.hexA(n.color, theme === 'crema' ? 0.16 : 0.18)
    c.strokeStyle = n.color
    c.lineWidth = 2.5 + glow * 1.5
    if (glow > 0) { c.shadowColor = n.color; c.shadowBlur = 18 * glow }
    c.beginPath()
    c.moveTo(x - w / 2, top + ry); c.lineTo(x - w / 2, bot - ry)
    c.bezierCurveTo(x - w / 2, bot + ry * 0.8, x + w / 2, bot + ry * 0.8, x + w / 2, bot - ry)
    c.lineTo(x + w / 2, top + ry)
    c.bezierCurveTo(x + w / 2, top - ry * 0.8, x - w / 2, top - ry * 0.8, x - w / 2, top + ry)
    c.fill(); c.stroke()
    c.beginPath(); c.ellipse(x, top + ry, w / 2, ry, 0, 0, Math.PI * 2); c.stroke()
    c.shadowBlur = 0
    drawLabelLines(c, n, theme, 17, n.y + 6)
  } else if (n.shape === 'text') {
    drawLabelLines(c, n, theme, 22, n.y)
  } else {
    c.fillStyle = DocumentState.hexA(n.color, theme === 'crema' ? 0.16 : 0.18)
    c.strokeStyle = n.color
    c.lineWidth = 2.5 + glow * 1.5
    if (glow > 0) { c.shadowColor = n.color; c.shadowBlur = 18 * glow }
    shapePath(c, n); c.fill(); c.stroke()
    c.shadowBlur = 0
    drawLabelLines(c, n, theme, 17, n.y)
  }
  c.restore()

  if (!isExport && eng.sel.selN.has(n.id)) {
    c.save()
    c.setLineDash([6, 5]); c.strokeStyle = '#3aa7e8'; c.lineWidth = 1.5
    c.strokeRect(n.x - n.w / 2 - 6, n.y - n.h / 2 - 6, n.w + 12, n.h + 12)
    c.setLineDash([])
    const s = eng.sel.singleSel()
    if (s && s.type === 'node' && s.obj && s.obj.id === n.id) {
      c.fillStyle = '#fff'; c.strokeStyle = '#3aa7e8'; c.lineWidth = 1.5
      for (const [cx, cy] of nodeCorners(n)) {
        c.beginPath(); c.rect(cx - HANDLE / 2, cy - HANDLE / 2, HANDLE, HANDLE); c.fill(); c.stroke()
      }
    }
    c.restore()
  }
}

function arrowHead(c: Ctx, x: number, y: number, ang: number, col: string): void {
  c.save()
  c.translate(x, y); c.rotate(ang)
  c.fillStyle = col
  c.beginPath(); c.moveTo(1, 0); c.lineTo(-11, -6); c.lineTo(-11, 6); c.closePath(); c.fill()
  c.restore()
}

export function drawEdge(c: Ctx, e: Edge, t: number, theme: string, isExport: boolean, eng: CanvasEngine): void {
  const settings = eng.state.settings
  const A = eng.state.nodeById(e.from)
  const B = eng.state.nodeById(e.to)
  if (!A || !B) return
  const a = Math.min(nodeAlpha(A, t, settings), nodeAlpha(B, t, settings))
  if (a <= 0) return
  const pts = edgePoints(e, id => eng.state.nodeById(id))
  if (pts.length < 2) return
  const T = THEMES[theme]
  const seld = !isExport && eng.sel.selE.has(e.id)
  const s = eng.sel.singleSel()
  const single = !isExport && !!(s && s.type === 'edge' && s.obj && s.obj.id === e.id)
  c.save()
  c.globalAlpha = a
  const lineCol = e.lineColor || T.edge
  c.strokeStyle = seld ? '#3aa7e8' : lineCol
  c.lineWidth = seld ? 2.6 : 2
  c.lineJoin = 'round'
  if (e.dashed) c.setLineDash([8, 7])
  c.beginPath(); c.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y)
  c.stroke(); c.setLineDash([])
  const last = pts[pts.length - 1]
  const prev = pts[pts.length - 2]
  if (e.endArrow !== false) {
    arrowHead(c, last.x, last.y, Math.atan2(last.y - prev.y, last.x - prev.x), seld ? '#3aa7e8' : lineCol)
  }
  if (e.startArrow) {
    const f0 = pts[0]
    const f1 = pts[1]
    arrowHead(c, f0.x, f0.y, Math.atan2(f0.y - f1.y, f0.x - f1.x), seld ? '#3aa7e8' : lineCol)
  }
  if (e.animated) {
    c.fillStyle = e.dotColor || A.color
    const n = settings.dots
    for (let i = 0; i < n; i++) {
      let base = (t * settings.speed + i / n) % 1
      if (base < 0) base += 1
      let f = base
      if (e.flowDir === 'reverse') f = 1 - base
      else if (e.flowDir === 'alternate') f = 1 - Math.abs(1 - 2 * base)
      const p = pointAt(pts, f)
      const fade = Math.min(1, Math.min(f, 1 - f) * 8)
      c.globalAlpha = a * fade
      c.beginPath(); c.arc(p.x, p.y, 5, 0, Math.PI * 2); c.fill()
      c.globalAlpha = a * fade * 0.3
      c.beginPath(); c.arc(p.x, p.y, 9, 0, Math.PI * 2); c.fill()
      c.globalAlpha = a
    }
  }
  if (e.label) {
    const m = pointAt(pts, 0.5)
    const efs = e.fs || 13
    c.font = efs + 'px Georgia, serif'
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    const w = c.measureText(e.label).width
    c.fillStyle = T.lblBg
    c.fillRect(m.x - w / 2 - 6, m.y - efs * 0.85, w + 12, efs * 1.7)
    c.fillStyle = T.edgeLbl
    c.fillText(e.label, m.x, m.y)
  }
  if (single) {
    c.lineWidth = 1.6
    ;(e.waypoints || []).forEach(wp => {
      c.fillStyle = '#3aa7e8'
      c.beginPath(); c.arc(wp.x, wp.y, 6, 0, Math.PI * 2); c.fill()
      c.strokeStyle = '#fff'; c.stroke()
    })
    for (let i = 1; i < pts.length; i++) {
      const mx = (pts[i - 1].x + pts[i].x) / 2
      const my = (pts[i - 1].y + pts[i].y) / 2
      c.fillStyle = theme === 'crema' ? '#f4eee1' : '#161616'
      c.strokeStyle = '#3aa7e8'
      c.beginPath(); c.arc(mx, my, 5, 0, Math.PI * 2); c.fill(); c.stroke()
    }
  }
  c.restore()
}

function drawSideArrows(c: Ctx, n: Node): void {
  c.save()
  for (const s of SIDES) {
    const p = sidePoint(n, s)
    const d = DIR[s]
    const bx = p.x + d.x * ARROW_OFF
    const by = p.y + d.y * ARROW_OFF
    const ang = Math.atan2(d.y, d.x)
    c.translate(bx, by); c.rotate(ang)
    c.fillStyle = 'rgba(58,167,232,.9)'
    c.beginPath()
    c.moveTo(10, 0); c.lineTo(-4, -9); c.lineTo(-4, -3.5); c.lineTo(-12, -3.5)
    c.lineTo(-12, 3.5); c.lineTo(-4, 3.5); c.lineTo(-4, 9); c.closePath(); c.fill()
    c.rotate(-ang); c.translate(-bx, -by)
  }
  c.restore()
}

export function render(c: Ctx, t: number, eng: CanvasEngine, opts: RenderOpts = {}): void {
  const state = eng.state
  const theme = state.doc.theme
  const T = THEMES[theme]
  const settings = state.settings
  const page = state.currentPage()
  const isExport = !!opts.export

  if (isExport) {
    const b = opts.bounds || state.getBounds()
    c.clearRect(b.x, b.y, b.w, b.h)
    if (opts.bg) { c.fillStyle = opts.bg; c.fillRect(b.x, b.y, b.w, b.h) }
    else if (!opts.transparent) { c.fillStyle = T.bg; c.fillRect(b.x, b.y, b.w, b.h) }
    if (settings.grid) {
      c.strokeStyle = T.grid; c.lineWidth = 1; c.beginPath()
      const startX = Math.floor(b.x / GRID) * GRID
      const startY = Math.floor(b.y / GRID) * GRID
      for (let x = startX; x < b.x + b.w; x += GRID) { c.moveTo(x, b.y); c.lineTo(x, b.y + b.h) }
      for (let y = startY; y < b.y + b.h; y += GRID) { c.moveTo(b.x, y); c.lineTo(b.x + b.w, y) }
      c.stroke()
    }
    for (const e of page.edges) drawEdge(c, e, t, theme, isExport, eng)
    for (const n of page.nodes) drawNode(c, n, t, theme, isExport, eng)
    return
  }

  const cv = eng.canvas
  if (!cv) return
  eng.resizeCanvas()
  c.clearRect(0, 0, cv.width, cv.height)

  c.save()
  c.translate(eng.viewX, eng.viewY)
  c.scale(eng.viewZoom, eng.viewZoom)

  const wx = -eng.viewX / eng.viewZoom
  const wy = -eng.viewY / eng.viewZoom
  const ww = cv.width / eng.viewZoom
  const wh = cv.height / eng.viewZoom

  c.fillStyle = T.bg
  c.fillRect(wx, wy, ww, wh)

  if (settings.grid) {
    c.strokeStyle = T.grid; c.lineWidth = 1 / eng.viewZoom; c.beginPath()
    const sx = Math.floor(wx / GRID) * GRID
    const sy = Math.floor(wy / GRID) * GRID
    for (let x = sx; x < wx + ww + GRID; x += GRID) { c.moveTo(x, wy); c.lineTo(x, wy + wh) }
    for (let y = sy; y < wy + wh + GRID; y += GRID) { c.moveTo(wx, y); c.lineTo(wx + ww, y) }
    c.stroke()
  }

  for (const e of page.edges) drawEdge(c, e, t, theme, isExport, eng)
  for (const n of page.nodes) drawNode(c, n, t, theme, isExport, eng)

  if (eng.mode === 'select' && !eng.drag && !eng.resizing && !eng.wpDrag && !eng.connectDrag && !eng.marquee && !eng.pendingShape && !eng.pendingIcon) {
    if (eng.hoverNode) drawSideArrows(c, eng.hoverNode)
  }
  if (eng.connectDrag) {
    const A = state.nodeById(eng.connectDrag.fromId)
    if (A) {
      const p = sidePoint(A, eng.connectDrag.fromSide)
      c.save()
      c.strokeStyle = '#3aa7e8'; c.setLineDash([6, 5]); c.lineWidth = 2 / eng.viewZoom
      c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(eng.mouse.x, eng.mouse.y); c.stroke(); c.setLineDash([])
      if (eng.hoverNode && eng.hoverNode.id !== A.id) {
        const hv = eng.hoverNode
        c.strokeStyle = '#3aa7e8'; c.lineWidth = 2.5 / eng.viewZoom
        c.strokeRect(hv.x - hv.w / 2 - 4, hv.y - hv.h / 2 - 4, hv.w + 8, hv.h + 8)
        const near = nearestAnchorSide(hv, eng.mouse, 22)
        for (const s of SIDES) {
          const q = sidePoint(hv, s)
          c.beginPath(); c.arc(q.x, q.y, 6 / eng.viewZoom, 0, Math.PI * 2)
          if (s === near) {
            c.fillStyle = '#3aa7e8'; c.fill()
            c.strokeStyle = '#fff'; c.lineWidth = 1.6 / eng.viewZoom; c.stroke()
          } else {
            c.fillStyle = theme === 'crema' ? '#f4eee1' : '#161616'; c.fill()
            c.strokeStyle = '#3aa7e8'; c.lineWidth = 1.6 / eng.viewZoom; c.stroke()
          }
        }
      }
      c.restore()
    }
  }
  if (eng.connecting !== null) {
    const A = state.nodeById(eng.connecting)
    if (A) {
      c.save()
      c.strokeStyle = '#3aa7e8'; c.setLineDash([5, 5]); c.lineWidth = 2 / eng.viewZoom
      c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(eng.mouse.x, eng.mouse.y); c.stroke()
      c.restore()
    }
  }
  if (eng.marquee) {
    const r = normRect(eng.marquee)
    c.save()
    c.fillStyle = 'rgba(58,167,232,.12)'
    c.strokeStyle = '#3aa7e8'; c.lineWidth = 1 / eng.viewZoom
    c.fillRect(r.x, r.y, r.w, r.h); c.strokeRect(r.x, r.y, r.w, r.h)
    c.restore()
  }
  if (page.nodes.length === 0) {
    c.fillStyle = theme === 'crema' ? '#00000055' : '#ffffff44'
    c.font = (20 / eng.viewZoom) + 'px Georgia, serif'
    c.textAlign = 'center'
    c.fillText(
      'Elige una forma o icono a la izquierda y haz clic aquí',
      (cv.width / 2 - eng.viewX) / eng.viewZoom,
      (cv.height / 2 - eng.viewY) / eng.viewZoom,
    )
  }

  c.restore()
}
