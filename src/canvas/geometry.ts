'use strict'

import { DIR, SIDES } from './config'
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

export function anchorPt(n: Node, side: Side | null, tx: number, ty: number): Point {
  return side ? sidePoint(n, side) : autoAnchor(n, tx, ty)
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

export function edgePoints(e: Edge, getNode: (id: number) => Node | undefined): Point[] {
  const A = getNode(e.from)
  const B = getNode(e.to)
  if (!A || !B) return []
  const wps = e.waypoints || []
  const tA = wps[0] || { x: B.x, y: B.y }
  const tB = wps[wps.length - 1] || { x: A.x, y: A.y }
  const p1 = anchorPt(A, e.fromSide, tA.x, tA.y)
  const p2 = anchorPt(B, e.toSide, tB.x, tB.y)
  if (e.route === 'ortho' && wps.length === 0) {
    const d1 = DIR[e.fromSide || inferSide(A, p1)]
    const d2 = DIR[e.toSide || inferSide(B, p2)]
    return orthoRoute(p1, d1, p2, d2)
  }
  return [p1, ...wps, p2]
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
