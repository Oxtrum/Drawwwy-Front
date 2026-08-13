'use strict'

import { ARROW_OFF, DIR, SIDES } from './config'
import type { Bounds, Edge, Node, Point, PointAng, Shape, Side } from './types'

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v))

/** Calcula el rectángulo de un elemento que se está creando mediante arrastre. */
export function placementBounds(start: Point, current: Point, shape: Shape): Bounds {
  const dx = current.x - start.x
  const dy = current.y - start.y
  let w = Math.max(40, Math.round(Math.abs(dx)))
  let h = Math.max(30, Math.round(Math.abs(dy)))
  const aspect = shape === 'circle' ? 1 : shape === 'icon' ? 120 / 92 : shape === 'image' ? 220 / 160 : null

  if (aspect) {
    if (w / aspect > h) h = Math.max(30, Math.round(w / aspect))
    else w = Math.max(40, Math.round(h * aspect))
  }

  return {
    x: (start.x + current.x) / 2 - w / 2,
    y: (start.y + current.y) / 2 - h / 2,
    w,
    h,
  }
}

export function sidePoint(n: Node, s: Side): Point {
  switch (s) {
    case 'n': return { x: n.x, y: n.y - n.h / 2 }
    case 's': return { x: n.x, y: n.y + n.h / 2 }
    case 'e': return { x: n.x + n.w / 2, y: n.y }
    case 'w': return { x: n.x - n.w / 2, y: n.y }
  }
}

/** Punto sobre el perímetro asociado a un lado. `position` recorre el lado de
 *  0 a 1 y conserva el centro histórico en 0.5. En círculos y rombos se
 *  recorre el tramo equivalente de su perímetro, no la caja envolvente. */
export function sideAnchorPoint(n: Node, s: Side, position = 0.5): Point {
  const t = clamp(position, 0, 1)
  const hw = n.w / 2
  const hh = n.h / 2

  if (n.shape === 'circle') {
    const ranges: Record<Side, [number, number]> = {
      n: [-3 * Math.PI / 4, -Math.PI / 4],
      e: [-Math.PI / 4, Math.PI / 4],
      s: [Math.PI / 4, 3 * Math.PI / 4],
      w: [3 * Math.PI / 4, 5 * Math.PI / 4],
    }
    const [a, b] = ranges[s]
    const angle = lerp(a, b, t)
    return { x: n.x + Math.cos(angle) * hw, y: n.y + Math.sin(angle) * hh }
  }

  if (n.shape === 'diamond') {
    const top = { x: n.x, y: n.y - hh }
    const right = { x: n.x + hw, y: n.y }
    const bottom = { x: n.x, y: n.y + hh }
    const left = { x: n.x - hw, y: n.y }
    const [a, b, c] = {
      n: [left, top, right], e: [top, right, bottom],
      s: [right, bottom, left], w: [bottom, left, top],
    }[s]
    const u = t * 2
    return u <= 1
      ? { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) }
      : { x: lerp(b.x, c.x, u - 1), y: lerp(b.y, c.y, u - 1) }
  }

  switch (s) {
    case 'n': return { x: n.x - hw + n.w * t, y: n.y - hh }
    case 's': return { x: n.x + hw - n.w * t, y: n.y + hh }
    case 'e': return { x: n.x + hw, y: n.y - hh + n.h * t }
    case 'w': return { x: n.x - hw, y: n.y + hh - n.h * t }
  }
}

export function autoAnchor(n: Node, tx: number, ty: number): Point {
  const dx = tx - n.x
  const dy = ty - n.y
  if (dx === 0 && dy === 0) return { x: n.x, y: n.y }
  if (n.shape === 'circle') {
    const r = n.w / 2
    const L = Math.hypot(dx, dy)
    return { x: n.x + dx / L * r, y: n.y + dy / L * r }
  }
  if (n.shape === 'diamond') {
    const k = 1 / ((Math.abs(dx) / (n.w / 2)) + (Math.abs(dy) / (n.h / 2)))
    return { x: n.x + dx * k, y: n.y + dy * k }
  }
  const sx = (n.w / 2) / Math.abs(dx || 1e-9)
  const sy = (n.h / 2) / Math.abs(dy || 1e-9)
  const s = Math.min(sx, sy)
  return { x: n.x + dx * s, y: n.y + dy * s }
}

export function anchorPt(n: Node, side: Side | null, tx: number, ty: number, position = 0.5): Point {
  return side ? sideAnchorPoint(n, side, position) : autoAnchor(n, tx, ty)
}

export function inferSide(n: Node, p: Point): Side {
  const dx = (p.x - n.x) / (n.w / 2 || 1)
  const dy = (p.y - n.y) / (n.h / 2 || 1)
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'e' : 'w') : (dy > 0 ? 's' : 'n')
}

export function nearestAnchorSide(n: Node, p: Point, maxDist: number): Side | null {
  let best: Side | null = null
  let bd = maxDist
  for (const s of SIDES) {
    const q = sidePoint(n, s)
    const d = Math.hypot(p.x - q.x, p.y - q.y)
    if (d < bd) { bd = d; best = s }
  }
  return best
}

/** Convierte una posición del cursor en el lado y la posición normalizada del
 *  anclaje más cercano. La coordenada queda acotada al perímetro del nodo. */
export function nearestSideAnchor(n: Node, p: Point): { side: Side; position: number } {
  const side = inferSide(n, p)
  const left = n.x - n.w / 2
  const top = n.y - n.h / 2
  let position: number
  switch (side) {
    case 'n': position = (p.x - left) / n.w; break
    case 's': position = 1 - (p.x - left) / n.w; break
    case 'e': position = (p.y - top) / n.h; break
    case 'w': position = 1 - (p.y - top) / n.h; break
  }
  return { side, position: clamp(position, 0, 1) }
}

export function sideOfPoint(n: Node, p: Point): Side {
  const t = 3
  if (Math.abs(p.y - (n.y - n.h / 2)) < t) return 'n'
  if (Math.abs(p.y - (n.y + n.h / 2)) < t) return 's'
  if (Math.abs(p.x - (n.x - n.w / 2)) < t) return 'w'
  if (Math.abs(p.x - (n.x + n.w / 2)) < t) return 'e'
  return inferSide(n, p)
}

export function orthoRoute(p1: Point, d1: Point, p2: Point, d2: Point): Point[] {
  const pad = 28
  const s = { x: p1.x + d1.x * pad, y: p1.y + d1.y * pad }
  const t = { x: p2.x + d2.x * pad, y: p2.y + d2.y * pad }
  let mids: Point[]
  if (d1.x !== 0 && d2.x !== 0) {
    const mx = (s.x + t.x) / 2
    mids = [{ x: mx, y: s.y }, { x: mx, y: t.y }]
  } else if (d1.y !== 0 && d2.y !== 0) {
    const my = (s.y + t.y) / 2
    mids = [{ x: s.x, y: my }, { x: t.x, y: my }]
  } else if (d1.x !== 0) {
    mids = [{ x: t.x, y: s.y }]
  } else {
    mids = [{ x: s.x, y: t.y }]
  }
  const raw: Point[] = [p1, s, ...mids, t, p2]
  const out: Point[] = [raw[0]]
  for (let i = 1; i < raw.length; i++) {
    const a = out[out.length - 1]
    const b = raw[i]
    if (Math.hypot(a.x - b.x, a.y - b.y) > 1) out.push(b)
  }
  return out
}

function compactRoute(raw: Point[]): Point[] {
  const out: Point[] = [raw[0]]
  for (let i = 1; i < raw.length; i++) {
    const a = out[out.length - 1]
    const b = raw[i]
    if (Math.hypot(a.x - b.x, a.y - b.y) > 1) out.push(b)
  }
  return out
}

function segmentCrossesNodeInterior(a: Point, b: Point, n: Node): boolean {
  const minX = n.x - n.w / 2
  const maxX = n.x + n.w / 2
  const minY = n.y - n.h / 2
  const maxY = n.y + n.h / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  let enter = 0
  let leave = 1
  for (const [origin, delta, lo, hi] of [[a.x, dx, minX, maxX], [a.y, dy, minY, maxY]] as const) {
    if (Math.abs(delta) < 1e-9) {
      if (origin <= lo || origin >= hi) return false
      continue
    }
    const t1 = (lo - origin) / delta
    const t2 = (hi - origin) / delta
    enter = Math.max(enter, Math.min(t1, t2))
    leave = Math.min(leave, Math.max(t1, t2))
  }
  return leave - enter > 1e-6
}

function crossesConnectedNodes(points: Point[], a: Node, b: Node): boolean {
  for (let i = 1; i < points.length; i++) {
    if (segmentCrossesNodeInterior(points[i - 1], points[i], a) || segmentCrossesNodeInterior(points[i - 1], points[i], b)) return true
  }
  return false
}

/** Si una ruta automática cortaría el interior de uno de sus extremos, sale
 *  por fuera del rectángulo que ambos ocupan. La excepción permite respetar
 *  los lados seleccionados incluso cuando una línea recta sería imposible. */
function avoidConnectedNodes(base: Point[], p1: Point, d1: Point, p2: Point, d2: Point, a: Node, b: Node): Point[] {
  if (!crossesConnectedNodes(base, a, b)) return base
  const pad = 28
  const s = { x: p1.x + d1.x * pad, y: p1.y + d1.y * pad }
  const t = { x: p2.x + d2.x * pad, y: p2.y + d2.y * pad }
  const left = Math.min(a.x - a.w / 2, b.x - b.w / 2) - pad
  const right = Math.max(a.x + a.w / 2, b.x + b.w / 2) + pad
  const top = Math.min(a.y - a.h / 2, b.y - b.h / 2) - pad
  const bottom = Math.max(a.y + a.h / 2, b.y + b.h / 2) + pad
  const candidates = [
    compactRoute([p1, s, { x: left, y: s.y }, { x: left, y: t.y }, t, p2]),
    compactRoute([p1, s, { x: right, y: s.y }, { x: right, y: t.y }, t, p2]),
    compactRoute([p1, s, { x: s.x, y: top }, { x: t.x, y: top }, t, p2]),
    compactRoute([p1, s, { x: s.x, y: bottom }, { x: t.x, y: bottom }, t, p2]),
  ].filter(route => !crossesConnectedNodes(route, a, b))
  if (!candidates.length) return base
  return candidates.reduce((best, route) => polyLen(route) < polyLen(best) ? route : best)
}

/** Ruta para una arista que sale y vuelve al mismo nodo: un "bulto" rectangular
 *  que sobresale del lado dado, entrando y saliendo por dos puntos distintos
 *  de ese mismo lado (no hay otro nodo con el que triangular la dirección). */
export function selfLoopRoute(n: Node, side: Side): Point[] {
  const d = DIR[side]
  const perp: Point = { x: d.y, y: d.x }
  const half = (perp.x ? n.w : n.h) / 2
  const t = Math.min(half * 0.6, 22)
  const base = sidePoint(n, side)
  const p1 = { x: base.x - perp.x * t, y: base.y - perp.y * t }
  const p2 = { x: base.x + perp.x * t, y: base.y + perp.y * t }
  const pad = ARROW_OFF * 2.2
  const q1 = { x: p1.x + d.x * pad, y: p1.y + d.y * pad }
  const q2 = { x: p2.x + d.x * pad, y: p2.y + d.y * pad }
  return [p1, q1, q2, p2]
}

export function edgePoints(e: Edge, getNode: (id: number) => Node | undefined): Point[] {
  const A = getNode(e.from)
  const B = getNode(e.to)
  if (!A || !B) return []
  if (e.from === e.to) return selfLoopRoute(A, e.fromSide || 'e')
  const wps = e.waypoints || []
  const tA = wps[0] || { x: B.x, y: B.y }
  const tB = wps[wps.length - 1] || { x: A.x, y: A.y }
  const p1 = anchorPt(A, e.fromSide, tA.x, tA.y, e.fromAnchor)
  const p2 = anchorPt(B, e.toSide, tB.x, tB.y, e.toAnchor)
  if (e.route === 'ortho' && wps.length === 0) {
    const d1 = DIR[e.fromSide || inferSide(A, p1)]
    const d2 = DIR[e.toSide || inferSide(B, p2)]
    return avoidConnectedNodes(orthoRoute(p1, d1, p2, d2), p1, d1, p2, d2, A, B)
  }
  const route = [p1, ...wps, p2]
  if (wps.length) return route
  return avoidConnectedNodes(route, p1, DIR[e.fromSide || inferSide(A, p1)], p2, DIR[e.toSide || inferSide(B, p2)], A, B)
}

export function polyLen(pts: Point[]): number {
  let L = 0
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  return L
}

export function pointAt(pts: Point[], f: number): PointAng {
  const L = polyLen(pts)
  if (L === 0) return { x: pts[0].x, y: pts[0].y, ang: 0 }
  let target = clamp(f, 0, 1) * L
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
    if (target <= seg || i === pts.length - 1) {
      const u = seg ? target / seg : 0
      return {
        x: lerp(pts[i - 1].x, pts[i].x, u),
        y: lerp(pts[i - 1].y, pts[i].y, u),
        ang: Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x),
      }
    }
    target -= seg
  }
  return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y, ang: 0 }
}
