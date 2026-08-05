'use strict'

import { ARROW_OFF, DIR, FONT_SANS, GRID, HANDLE, HANDLE_MAX, ICONS, PALETTE, SIDES, canvasFont, getImg, iconGlyphURL, themeOf } from './config'
import { edgePoints, nearestAnchorSide, placementBounds, pointAt, sidePoint } from './geometry'
import { DocumentState } from './state'
import type { Bounds, DotShape, Edge, MarqueeState, Node, Settings, ThemeColors } from './types'
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

/** Ícono de archivo JSON (doblez en la esquina + "JSON" recortado), en su
 *  viewBox nativo de 1321.45x1333.33 — se centra y escala en `drawFlowMarker`. */
const JSON_ICON_PATH = new Path2D('M221.37 618.44h757.94V405.15H755.14c-23.5 0-56.32-12.74-71.82-28.24-15.5-15.5-25-43.47-25-66.97V82.89H88.39c-1.99 0-3.49 1-4.49 2-1.5 1-2 2.5-2 4.5v1155.04c0 1.5 1 3.5 2 4.5 1 1.49 3 1.99 4.49 1.99H972.8c2 0 1.89-.99 2.89-1.99 1.5-1 3.61-3 3.61-4.5v-121.09H221.36c-44.96 0-82-36.9-82-81.99V700.44c0-45.1 36.9-82 82-82zm126.51 117.47h75.24v146.61c0 30.79-2.44 54.23-7.33 70.31-4.92 16.03-14.8 29.67-29.65 40.85-14.86 11.12-33.91 16.72-57.05 16.72-24.53 0-43.51-3.71-56.94-11.06-13.5-7.36-23.89-18.1-31.23-32.3-7.35-14.14-11.69-31.67-12.99-52.53l71.5-10.81c.11 11.81 1.07 20.61 2.81 26.33 1.76 5.78 4.75 10.37 9 13.95 2.87 2.33 6.94 3.46 12.25 3.46 8.4 0 14.58-3.46 18.53-10.37 3.9-6.92 5.87-18.6 5.87-35V735.92zm112.77 180.67l71.17-4.97c1.54 12.81 4.69 22.62 9.44 29.28 7.74 10.88 18.74 16.34 33.09 16.34 10.68 0 18.93-2.76 24.68-8.36 5.81-5.58 8.7-12.07 8.7-19.41 0-6.97-2.71-13.26-8.2-18.79-5.47-5.53-18.23-10.68-38.28-15.65-32.89-8.17-56.27-19.1-70.26-32.74-14.12-13.57-21.18-30.92-21.18-52.03 0-13.83 3.61-26.89 10.85-39.21 7.22-12.38 18.07-22.06 32.59-29.09 14.52-7.04 34.4-10.56 59.65-10.56 31 0 54.62 6.41 70.88 19.29 16.28 12.81 25.92 33.24 29.04 61.27l-70.5 4.65c-1.87-12.25-5.81-21.17-11.81-26.7-6.05-5.6-14.35-8.36-24.9-8.36-8.71 0-15.31 2.07-19.73 6.16-4.4 4.09-6.59 9.12-6.59 15.02 0 4.27 1.81 8.11 5.37 11.57 3.45 3.59 11.8 6.85 25.02 9.93 32.75 7.86 56.2 15.84 70.31 23.87 14.18 8.05 24.52 17.98 30.96 29.92 6.44 11.88 9.66 25.2 9.66 39.96 0 17.29-4.3 33.24-12.88 47.89-8.63 14.58-20.61 25.7-36.08 33.24-15.41 7.54-34.85 11.31-58.33 11.31-41.24 0-69.81-8.86-85.68-26.52-15.88-17.65-24.85-40.09-26.96-67.3zm248.74-45.5c0-44.05 11.02-78.36 33.09-102.87 22.09-24.57 52.82-36.82 92.24-36.82 40.38 0 71.5 12.07 93.34 36.13 21.86 24.13 32.77 57.94 32.77 101.37 0 31.54-4.75 57.36-14.3 77.54-9.54 20.18-23.37 35.89-41.4 47.13-18.07 11.24-40.55 16.84-67.48 16.84-27.33 0-49.99-4.83-67.94-14.52-17.92-9.74-32.49-25.07-43.62-46.06-11.13-20.92-16.72-47.19-16.72-78.74zm74.89.19c0 27.21 4.57 46.81 13.68 58.68 9.13 11.88 21.57 17.85 37.26 17.85 16.1 0 28.65-5.84 37.45-17.47 8.87-11.68 13.28-32.54 13.28-62.77 0-25.39-4.63-43.92-13.84-55.61-9.26-11.76-21.75-17.6-37.56-17.6-15.13 0-27.34 5.97-36.49 17.85-9.21 11.88-13.78 31.61-13.78 59.07zm209.08-135.36h69.99l90.98 149.05V735.91h70.83v269.96h-70.83l-90.48-148.24v148.24h-70.49V735.91zm67.71-117.47h178.37c45.1 0 82 37.04 82 82v340.91c0 44.96-37.03 81.99-82 81.99h-178.37v147c0 17.5-6.99 32.99-18.5 44.5-11.5 11.49-27 18.5-44.5 18.5H62.97c-17.5 0-32.99-7-44.5-18.5-11.49-11.5-18.5-27-18.5-44.5V63.49c0-17.5 7-33 18.5-44.5S45.97.49 62.97.49H700.1c1.5-.5 3-.5 4.5-.5 7 0 14 3 19 7.49h1c1 .5 1.5 1 2.5 2l325.46 329.47c5.5 5.5 9.5 13 9.5 21.5 0 2.5-.5 4.5-1 7v250.98zM732.61 303.47V96.99l232.48 235.47H761.6c-7.99 0-14.99-3.5-20.5-8.49-4.99-5-8.49-12.5-8.49-20.5z')

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

/** Prepara trazo/relleno del nodo; devuelve si hay relleno que pintar (una
 *  figura recién colocada no tiene relleno hasta que el usuario elige uno). */
function applyShapeStyle(c: Ctx, n: Node, glow: number): boolean {
  c.strokeStyle = n.color
  c.lineWidth = (n.borderWidth ?? 2.5) + glow * 1.5
  if (n.lineStyle === 'dashed') c.setLineDash([10, 6])
  else if (n.lineStyle === 'dotted') { c.setLineDash([1, 7]); c.lineCap = 'round' }
  if (!n.fill) return false
  c.fillStyle = DocumentState.hexA(n.fill, n.fillOpacity ?? 1)
  return true
}

function drawLabelLines(c: Ctx, n: Node, theme: string, baseFs: number, cy: number): void {
  const T = themeOf(theme)
  c.fillStyle = n.shape === 'text' ? n.color : T.text
  const weight = n.bold ? 700 : 500
  const family = n.font || FONT_SANS
  const align = n.align || 'center'
  c.textAlign = align
  c.textBaseline = 'middle'
  const lines = String(n.label).split('\n')
  let fs = n.fs || baseFs
  c.font = canvasFont(fs, weight, family)
  if (!n.fs) {
    const maxW = Math.max(...lines.map(l => c.measureText(l).width), 1)
    const avail = n.w - 18
    if (maxW > avail) {
      fs = Math.max(10, fs * avail / maxW)
      c.font = canvasFont(fs, weight, family)
    }
  }
  const pad = 9
  const lx = align === 'left' ? n.x - n.w / 2 + pad : align === 'right' ? n.x + n.w / 2 - pad : n.x
  const lh = fs * 1.25
  const oy = cy - (lines.length - 1) * lh / 2
  lines.forEach((l, i) => c.fillText(l, lx, oy + i * lh))
}

export function nodeCorners(n: Node): Array<[number, number]> {
  return [
    [n.x - n.w / 2 - 6, n.y - n.h / 2 - 6],
    [n.x + n.w / 2 + 6, n.y - n.h / 2 - 6],
    [n.x + n.w / 2 + 6, n.y + n.h / 2 + 6],
    [n.x - n.w / 2 - 6, n.y + n.h / 2 + 6],
  ]
}

/** Tamaño del cuadradito de resize en cada esquina: crece con el nodo (para
 *  que siga siendo fácil de agarrar en imágenes/figuras grandes) pero no pasa
 *  de HANDLE_MAX para no volverse un estorbo visual en nodos enormes. */
export function handleSize(n: Node): number {
  return DocumentState.clamp(Math.min(n.w, n.h) * 0.09, HANDLE, HANDLE_MAX)
}

export function drawNode(c: Ctx, n: Node, t: number, theme: string, isExport: boolean, eng: CanvasEngine): void {
  const T = themeOf(theme)
  const settings = eng.state.settings
  const a = isExport ? 1 : nodeAlpha(n, t, settings)
  if (a <= 0) return
  c.save()
  c.globalAlpha = a * (n.opacity ?? 1)
  const grow = settings.build ? DocumentState.lerp(0.85, 1, a) : 1
  c.translate(n.x, n.y); c.scale(grow, grow); c.translate(-n.x, -n.y)
  let glow = 0
  if (n.pulse) glow = (Math.sin(t * 2 * Math.PI * Math.max(0.3, n.pulseSpeed ?? settings.speed) * 2) + 1) / 2
  const pulseColor = n.pulseColor || n.color
  const pulseSize = n.pulseSize ?? 18

  if (n.shape === 'image' && n.img) {
    const im = getImg(n.img)
    if (im.complete && im.naturalWidth) {
      if (glow > 0) { c.shadowColor = pulseColor; c.shadowBlur = pulseSize * glow }
      c.drawImage(im, n.x - n.w / 2, n.y - n.h / 2, n.w, n.h)
      c.shadowBlur = 0
    }
    if (n.imgBorder) {
      c.strokeStyle = n.color
      c.lineWidth = n.borderWidth ?? 2.5
      if (n.lineStyle === 'dashed') c.setLineDash([10, 6])
      else if (n.lineStyle === 'dotted') { c.setLineDash([1, 7]); c.lineCap = 'round' }
      c.beginPath()
      roundRect(c, n.x - n.w / 2, n.y - n.h / 2, n.w, n.h, 10)
      c.stroke()
    }
    if (n.label) drawLabelLines(c, n, theme, 14, n.y + n.h / 2 + 14)
  } else if (n.shape === 'icon') {
    const im = getImg(iconGlyphURL[n.icon ?? ''] || '')
    const s = Math.min(n.w, n.h - 26) * 0.78
    const bx = n.x - s / 2
    const by = n.y - n.h / 2 + 4
    const bs = s / 64
    // El fondo del badge se redibuja acá (con el color propio del nodo, editable)
    // en vez de venir horneado en la imagen del ícono, que solo trae el glifo.
    c.fillStyle = n.color
    c.beginPath()
    roundRect(c, bx + 2 * bs, by + 2 * bs, 60 * bs, 60 * bs, 14 * bs)
    c.fill()
    if (glow > 0) { c.shadowColor = pulseColor; c.shadowBlur = pulseSize * glow }
    if (im.complete && im.naturalWidth) c.drawImage(im, bx, by, s, s)
    c.shadowBlur = 0
    if (n.label) drawLabelLines(c, n, theme, 14, n.y + n.h / 2 - 10)
  } else if (n.shape === 'cylinder') {
    const { x, y, w, h } = n
    const ry = Math.min(16, h * 0.18)
    const top = y - h / 2
    const bot = y + h / 2
    const hasFill = applyShapeStyle(c, n, glow)
    if (glow > 0) { c.shadowColor = pulseColor; c.shadowBlur = pulseSize * glow }
    c.beginPath()
    c.moveTo(x - w / 2, top + ry); c.lineTo(x - w / 2, bot - ry)
    c.bezierCurveTo(x - w / 2, bot + ry * 0.8, x + w / 2, bot + ry * 0.8, x + w / 2, bot - ry)
    c.lineTo(x + w / 2, top + ry)
    c.bezierCurveTo(x + w / 2, top - ry * 0.8, x - w / 2, top - ry * 0.8, x - w / 2, top + ry)
    if (hasFill) c.fill()
    c.stroke()
    c.beginPath(); c.ellipse(x, top + ry, w / 2, ry, 0, 0, Math.PI * 2); c.stroke()
    c.shadowBlur = 0
    drawLabelLines(c, n, theme, 17, n.y + 6)
  } else if (n.shape === 'text') {
    drawLabelLines(c, n, theme, 22, n.y)
  } else {
    const hasFill = applyShapeStyle(c, n, glow)
    if (glow > 0) { c.shadowColor = pulseColor; c.shadowBlur = pulseSize * glow }
    shapePath(c, n)
    if (hasFill) c.fill()
    c.stroke()
    c.shadowBlur = 0
    drawLabelLines(c, n, theme, 17, n.y)
  }
  c.restore()

  if (!isExport && eng.sel.selN.has(n.id)) {
    c.save()
    c.setLineDash([6, 5]); c.strokeStyle = T.sel; c.lineWidth = 1.5
    c.strokeRect(n.x - n.w / 2 - 6, n.y - n.h / 2 - 6, n.w + 12, n.h + 12)
    c.setLineDash([])
    const s = eng.sel.singleSel()
    if (s && s.type === 'node' && s.obj && s.obj.id === n.id) {
      c.fillStyle = T.light ? '#FFFFFF' : '#F8FAFC'; c.strokeStyle = T.sel; c.lineWidth = 1.5
      const hs = handleSize(n)
      for (const [cx, cy] of nodeCorners(n)) {
        c.beginPath(); c.rect(cx - hs / 2, cy - hs / 2, hs, hs); c.fill(); c.stroke()
      }
    }
    c.restore()
  }
}

function arrowHead(c: Ctx, x: number, y: number, ang: number, col: string, lineWidth: number): void {
  const s = DocumentState.clamp(lineWidth / 2, 0.65, 2.3)
  c.save()
  c.translate(x, y); c.rotate(ang)
  c.fillStyle = col
  c.beginPath(); c.moveTo(s, 0); c.lineTo(-11 * s, -6 * s); c.lineTo(-11 * s, 6 * s); c.closePath(); c.fill()
  c.restore()
}

/** Dibuja un marcador de flujo (el "paquete" que viaja por la arista) centrado en
 *  (x, y). `ang` es la tangente de la trayectoria; solo el triángulo la usa para
 *  apuntar en la dirección real de viaje (ya resuelta por el llamador para
 *  reverse/alternate). El resto de formas son simétricas y quedan sin rotar. */
function drawFlowMarker(c: Ctx, x: number, y: number, ang: number, shape: DotShape, size: number, color: string, alpha: number): void {
  c.save()
  c.translate(x, y)
  if (shape === 'triangle') c.rotate(ang)

  c.globalAlpha = alpha * 0.32
  c.fillStyle = color
  c.beginPath(); c.arc(0, 0, size * 1.8, 0, Math.PI * 2); c.fill()

  c.globalAlpha = alpha
  c.fillStyle = color
  c.strokeStyle = color
  c.lineWidth = Math.max(1, size * 0.22)
  c.lineJoin = 'round'
  c.lineCap = 'round'

  switch (shape) {
    case 'triangle':
      c.beginPath()
      c.moveTo(size * 1.35, 0); c.lineTo(-size * 0.85, -size * 0.95); c.lineTo(-size * 0.85, size * 0.95)
      c.closePath(); c.fill()
      break
    case 'diamond':
      c.beginPath()
      c.moveTo(0, -size * 1.2); c.lineTo(size * 1.2, 0); c.lineTo(0, size * 1.2); c.lineTo(-size * 1.2, 0)
      c.closePath(); c.fill()
      break
    case 'json': {
      const k = size / 500
      c.save()
      c.scale(k, k)
      c.translate(-660.7, -666.7)
      c.fill(JSON_ICON_PATH, 'evenodd')
      c.restore()
      break
    }
    case 'package': {
      const s = size * 1.15
      c.beginPath()
      roundRect(c, -s, -s, s * 2, s * 2, size * 0.25)
      c.stroke()
      c.beginPath()
      c.moveTo(-s, -s * 0.15); c.lineTo(s, -s * 0.15)
      c.moveTo(0, -s * 0.15); c.lineTo(0, s)
      c.stroke()
      break
    }
    case 'mail': {
      const w = size * 1.5
      const h = size * 1.05
      c.beginPath()
      roundRect(c, -w, -h, w * 2, h * 2, size * 0.2)
      c.stroke()
      c.beginPath()
      c.moveTo(-w, -h); c.lineTo(0, h * 0.15); c.lineTo(w, -h)
      c.stroke()
      break
    }
    default:
      c.beginPath(); c.arc(0, 0, size, 0, Math.PI * 2); c.fill()
  }
  c.restore()
}

export function drawEdge(c: Ctx, e: Edge, t: number, theme: string, isExport: boolean, eng: CanvasEngine): void {
  const settings = eng.state.settings
  const A = eng.state.nodeById(e.from)
  const B = eng.state.nodeById(e.to)
  if (!A || !B) return
  const a = isExport ? 1 : Math.min(nodeAlpha(A, t, settings), nodeAlpha(B, t, settings))
  if (a <= 0) return
  const pts = edgePoints(e, id => eng.state.nodeById(id))
  if (pts.length < 2) return
  const T = themeOf(theme)
  const seld = !isExport && eng.sel.selE.has(e.id)
  const s = eng.sel.singleSel()
  const single = !isExport && !!(s && s.type === 'edge' && s.obj && s.obj.id === e.id)
  c.save()
  c.globalAlpha = a
  const lineCol = e.lineColor || T.edge
  const w = e.lineWidth ?? 2
  c.strokeStyle = seld ? T.sel : lineCol
  c.lineWidth = seld ? w + 0.6 : w
  c.lineJoin = 'round'
  if (e.lineStyle === 'dashed') c.setLineDash([8, 7])
  else if (e.lineStyle === 'dotted') { c.setLineDash([1, 6]); c.lineCap = 'round' }
  c.beginPath(); c.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y)
  c.stroke(); c.setLineDash([])
  const last = pts[pts.length - 1]
  const prev = pts[pts.length - 2]
  if (e.endArrow !== false) {
    arrowHead(c, last.x, last.y, Math.atan2(last.y - prev.y, last.x - prev.x), seld ? T.sel : lineCol, w)
  }
  if (e.startArrow) {
    const f0 = pts[0]
    const f1 = pts[1]
    arrowHead(c, f0.x, f0.y, Math.atan2(f0.y - f1.y, f0.x - f1.x), seld ? T.sel : lineCol, w)
  }
  if (e.animated) {
    const dotColor = e.dotColor || A.color
    const dotShape = e.dotShape ?? 'circle'
    const dotSize = e.dotSize ?? 5
    const speed = e.dotSpeed ?? settings.speed
    const n = settings.dots
    for (let i = 0; i < n; i++) {
      let base = (t * speed + i / n) % 1
      if (base < 0) base += 1
      let f = base
      let reversed = false
      if (e.flowDir === 'reverse') {
        f = 1 - base
        reversed = true
      } else if (e.flowDir === 'alternate') {
        f = 1 - Math.abs(1 - 2 * base)
        reversed = base >= 0.5
      }
      const p = pointAt(pts, f)
      const fade = Math.min(1, Math.min(f, 1 - f) * 8)
      const ang = reversed ? p.ang + Math.PI : p.ang
      drawFlowMarker(c, p.x, p.y, ang, dotShape, dotSize, dotColor, a * fade)
    }
    c.globalAlpha = a
  }
  if (e.label) {
    const m = pointAt(pts, 0.5)
    const efs = e.fs || 13
    c.font = canvasFont(efs)
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
      c.fillStyle = T.sel
      c.beginPath(); c.arc(wp.x, wp.y, 6, 0, Math.PI * 2); c.fill()
      c.strokeStyle = T.lblBg; c.stroke()
    })
    for (let i = 1; i < pts.length; i++) {
      const mx = (pts[i - 1].x + pts[i].x) / 2
      const my = (pts[i - 1].y + pts[i].y) / 2
      c.fillStyle = T.lblBg
      c.strokeStyle = T.sel
      c.beginPath(); c.arc(mx, my, 5, 0, Math.PI * 2); c.fill(); c.stroke()
    }
  }
  c.restore()
}

function drawSideArrows(c: Ctx, n: Node, T: ThemeColors): void {
  c.save()
  for (const s of SIDES) {
    const p = sidePoint(n, s)
    const d = DIR[s]
    const bx = p.x + d.x * ARROW_OFF
    const by = p.y + d.y * ARROW_OFF
    const ang = Math.atan2(d.y, d.x)
    c.translate(bx, by); c.rotate(ang)
    c.fillStyle = DocumentState.hexA(T.sel, 0.9)
    c.beginPath()
    c.moveTo(10, 0); c.lineTo(-4, -9); c.lineTo(-4, -3.5); c.lineTo(-12, -3.5)
    c.lineTo(-12, 3.5); c.lineTo(-4, 3.5); c.lineTo(-4, 9); c.closePath(); c.fill()
    c.rotate(-ang); c.translate(-bx, -by)
  }
  c.restore()
}

/** Caja que envuelve a todos los miembros de un grupo, con holgura, en
 *  coordenadas de mundo. `null` si el grupo ya no tiene miembros en la página. */
function groupBounds(eng: CanvasEngine, gid: number): Bounds | null {
  const page = eng.state.currentPage()
  let mx = Infinity, my = Infinity, Mx = -Infinity, My = -Infinity
  const addP = (x: number, y: number): void => {
    if (x < mx) mx = x
    if (x > Mx) Mx = x
    if (y < my) my = y
    if (y > My) My = y
  }
  for (const n of page.nodes) {
    if (n.group !== gid) continue
    addP(n.x - n.w / 2, n.y - n.h / 2)
    addP(n.x + n.w / 2, n.y + n.h / 2)
  }
  for (const e of page.edges) {
    if (e.group !== gid) continue
    edgePoints(e, id => eng.state.nodeById(id)).forEach(p => addP(p.x, p.y))
  }
  if (mx === Infinity) return null
  const pad = 16
  return { x: mx - pad, y: my - pad, w: Mx - mx + pad * 2, h: My - my + pad * 2 }
}

/** Contorno de los grupos seleccionados: envuelve los recuadros individuales
 *  de cada miembro para que se lea que se mueven como una sola pieza. */
function drawGroupOutlines(c: Ctx, eng: CanvasEngine, T: ThemeColors): void {
  const groups = eng.sel.selectedGroups()
  if (!groups.size) return
  c.save()
  c.strokeStyle = DocumentState.hexA(T.sel, 0.7)
  c.lineWidth = 1.5 / eng.viewZoom
  c.setLineDash([12, 7])
  for (const gid of groups) {
    const b = groupBounds(eng, gid)
    if (!b) continue
    c.beginPath()
    roundRect(c, b.x, b.y, b.w, b.h, 10)
    c.stroke()
  }
  c.restore()
}

export function render(c: Ctx, t: number, eng: CanvasEngine, opts: RenderOpts = {}): void {
  const state = eng.state
  const theme = state.doc.theme
  const T = themeOf(theme)
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
    for (const item of state.zOrder(page)) {
      if (item.type === 'edge') drawEdge(c, item.obj, t, theme, isExport, eng)
      else drawNode(c, item.obj, t, theme, isExport, eng)
    }
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

  for (const item of state.zOrder(page)) {
    if (item.type === 'edge') drawEdge(c, item.obj, t, theme, isExport, eng)
    else drawNode(c, item.obj, t, theme, isExport, eng)
  }

  drawGroupOutlines(c, eng, T)

  if (eng.placement) {
    const placement = eng.placement
    const shape = placement.shape || (placement.icon ? 'icon' : 'rect')
    const b = placementBounds(placement.start, placement.current, shape)
    const preview: Node = {
      id: -1,
      z: 0,
      shape,
      x: b.x + b.w / 2,
      y: b.y + b.h / 2,
      w: b.w,
      h: b.h,
      label: placement.icon ? (ICONS[placement.icon]?.n || '') : shape === 'text' ? 'Texto' : 'Nodo',
      color: PALETTE[0].c,
      pulse: false,
      order: 0,
      icon: placement.icon || undefined,
    }
    c.save()
    c.globalAlpha = 0.72
    drawNode(c, preview, t, theme, false, eng)
    c.restore()
  }

  if (eng.mode === 'select' && !eng.drag && !eng.resizing && !eng.wpDrag && !eng.connectDrag && !eng.marquee && !eng.pendingShape && !eng.pendingIcon) {
    if (eng.hoverNode) drawSideArrows(c, eng.hoverNode, T)
  }
  if (eng.connectDrag) {
    const A = state.nodeById(eng.connectDrag.fromId)
    if (A) {
      const p = sidePoint(A, eng.connectDrag.fromSide)
      c.save()
      c.strokeStyle = T.sel; c.setLineDash([6, 5]); c.lineWidth = 2 / eng.viewZoom
      c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(eng.mouse.x, eng.mouse.y); c.stroke(); c.setLineDash([])
      if (eng.hoverNode && eng.hoverNode.id !== A.id) {
        const hv = eng.hoverNode
        c.strokeStyle = T.sel; c.lineWidth = 2.5 / eng.viewZoom
        c.strokeRect(hv.x - hv.w / 2 - 4, hv.y - hv.h / 2 - 4, hv.w + 8, hv.h + 8)
        const near = nearestAnchorSide(hv, eng.mouse, 22)
        for (const s of SIDES) {
          const q = sidePoint(hv, s)
          c.beginPath(); c.arc(q.x, q.y, 6 / eng.viewZoom, 0, Math.PI * 2)
          if (s === near) {
            c.fillStyle = T.sel; c.fill()
            c.strokeStyle = T.lblBg; c.lineWidth = 1.6 / eng.viewZoom; c.stroke()
          } else {
            c.fillStyle = T.lblBg; c.fill()
            c.strokeStyle = T.sel; c.lineWidth = 1.6 / eng.viewZoom; c.stroke()
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
      c.strokeStyle = T.sel; c.setLineDash([5, 5]); c.lineWidth = 2 / eng.viewZoom
      c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(eng.mouse.x, eng.mouse.y); c.stroke()
      c.restore()
    }
  }
  if (eng.marquee) {
    const r = normRect(eng.marquee)
    c.save()
    c.fillStyle = DocumentState.hexA(T.sel, 0.12)
    c.strokeStyle = T.sel; c.lineWidth = 1 / eng.viewZoom
    c.fillRect(r.x, r.y, r.w, r.h); c.strokeRect(r.x, r.y, r.w, r.h)
    c.restore()
  }
  

  c.restore()
}
