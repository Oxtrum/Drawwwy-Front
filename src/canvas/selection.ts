'use strict'

import { GRID } from './config'
import { DocumentState } from './state'
import type { Edge, Node, SingleSelection } from './types'

export interface Clip {
  nodes: Node[]
  edges: Edge[]
}

export interface PageSnap {
  pi: number
  data: { nodes: Node[]; edges: Edge[]; nextId: number }
}

export const CLIP_PREFIX = 'drawwwy::'

export type ArrangeDir = 'front' | 'forward' | 'backward' | 'back'

function withId<T extends { id: number }>(arr: T[], ids: Set<number>, dir: ArrangeDir): T[] {
  if (dir === 'front' || dir === 'back') {
    const rest = arr.filter(x => !ids.has(x.id))
    const moved = arr.filter(x => ids.has(x.id))
    return dir === 'front' ? [...rest, ...moved] : [...moved, ...rest]
  }
  const out = arr.slice()
  if (dir === 'forward') {
    for (let i = out.length - 2; i >= 0; i--) {
      if (ids.has(out[i].id) && !ids.has(out[i + 1].id)) [out[i], out[i + 1]] = [out[i + 1], out[i]]
    }
  } else {
    for (let i = 1; i < out.length; i++) {
      if (ids.has(out[i].id) && !ids.has(out[i - 1].id)) [out[i], out[i - 1]] = [out[i - 1], out[i]]
    }
  }
  return out
}

/** true si mover en `dir` cambiaría el orden (usado para deshabilitar los ítems del menú). */
function arrangeMoves<T extends { id: number }>(arr: T[], ids: Set<number>, dir: ArrangeDir): boolean {
  if (!ids.size) return false
  const n = arr.length
  if (dir === 'front') {
    for (let i = n - ids.size; i < n; i++) if (!ids.has(arr[i].id)) return true
    return false
  }
  if (dir === 'back') {
    for (let i = 0; i < ids.size; i++) if (!ids.has(arr[i].id)) return true
    return false
  }
  if (dir === 'forward') {
    for (let i = 0; i < n - 1; i++) if (ids.has(arr[i].id) && !ids.has(arr[i + 1].id)) return true
    return false
  }
  for (let i = 1; i < n; i++) if (ids.has(arr[i].id) && !ids.has(arr[i - 1].id)) return true
  return false
}

export class SelectionManager {
  selN = new Set<number>()
  selE = new Set<number>()
  clip: Clip | null = null
  undoStack: PageSnap[] = []
  redoStack: PageSnap[] = []

  private state: DocumentState
  private notify: () => void

  constructor(state: DocumentState, notify: () => void) {
    this.state = state
    this.notify = notify
  }

  clearSel(): void {
    this.selN.clear()
    this.selE.clear()
    this.notify()
  }

  selectOnly(type: 'node' | 'edge', id: number): void {
    this.selN.clear()
    this.selE.clear()
    ;(type === 'node' ? this.selN : this.selE).add(id)
    this.notify()
  }

  toggleSel(type: 'node' | 'edge', id: number): void {
    const s = type === 'node' ? this.selN : this.selE
    if (s.has(id)) s.delete(id)
    else s.add(id)
    this.notify()
  }

  singleSel(): SingleSelection | null {
    if (this.selN.size === 1 && this.selE.size === 0) {
      const obj = this.state.nodeById([...this.selN][0])
      return obj ? { type: 'node', obj } : null
    }
    if (this.selE.size === 1 && this.selN.size === 0) {
      const obj = this.state.edgeById([...this.selE][0])
      return obj ? { type: 'edge', obj } : null
    }
    return null
  }

  selectAll(): void {
    const page = this.state.currentPage()
    this.selN = new Set(page.nodes.map(n => n.id))
    this.selE = new Set(page.edges.map(e => e.id))
    this.notify()
  }

  copySel(): void {
    if (!this.selN.size && !this.selE.size) return
    const page = this.state.currentPage()
    const ns = page.nodes.filter(n => this.selN.has(n.id)).map(n => DocumentState.deep(n))
    const ids = new Set(ns.map(n => n.id))
    const es = page.edges
      .filter(e => this.selE.has(e.id) || (ids.has(e.from) && ids.has(e.to)))
      .map(e => DocumentState.deep(e))
    this.clip = { nodes: ns, edges: es }
    try {
      navigator.clipboard?.writeText(CLIP_PREFIX + JSON.stringify(this.clip)).catch(() => {})
    } catch {
      /* noop */
    }
  }

  cutSel(): void {
    this.copySel()
    this.deleteSel()
  }

  pasteClip(): void {
    const clip = this.clip
    if (!clip || (!clip.nodes.length && !clip.edges.length)) return
    this.pushUndo()
    const page = this.state.currentPage()
    const map: Record<number, number> = {}
    this.selN.clear()
    this.selE.clear()
    clip.nodes.forEach(n => {
      const c = DocumentState.deep(n)
      map[n.id] = c.id = page.nextId++
      c.x += GRID
      c.y += GRID
      c.order = page.nodes.length
      page.nodes.push(c)
      this.selN.add(c.id)
    })
    clip.edges.forEach(e => {
      const c = DocumentState.deep(e)
      c.id = page.nextId++
      c.from = map[e.from] ?? e.from
      c.to = map[e.to] ?? e.to
      ;(c.waypoints || []).forEach(w => { w.x += GRID; w.y += GRID })
      page.edges.push(c)
      this.selE.add(c.id)
    })
    clip.nodes.forEach(n => { n.x += GRID; n.y += GRID })
    clip.edges.forEach(e => (e.waypoints || []).forEach(w => { w.x += GRID; w.y += GRID }))
    this.notify()
  }

  dupSel(): void {
    const keep = this.clip
    this.copySel()
    this.pasteClip()
    this.clip = keep
  }

  canArrange(dir: ArrangeDir): boolean {
    const page = this.state.currentPage()
    return arrangeMoves(page.nodes, this.selN, dir) || arrangeMoves(page.edges, this.selE, dir)
  }

  arrange(dir: ArrangeDir): void {
    if (!this.canArrange(dir)) return
    this.pushUndo()
    const page = this.state.currentPage()
    if (this.selN.size) page.nodes = withId(page.nodes, this.selN, dir)
    if (this.selE.size) page.edges = withId(page.edges, this.selE, dir)
    this.state.scheduleAutosave()
    this.notify()
  }

  deleteSel(): void {
    if (!this.selN.size && !this.selE.size) return
    this.pushUndo()
    const page = this.state.currentPage()
    page.edges = page.edges.filter(e => !this.selE.has(e.id) && !this.selN.has(e.from) && !this.selN.has(e.to))
    page.nodes = page.nodes.filter(n => !this.selN.has(n.id))
    this.clearSel()
  }

  snapPage(): PageSnap {
    const page = this.state.currentPage()
    return {
      pi: this.state.doc.cur,
      data: DocumentState.deep({ nodes: page.nodes, edges: page.edges, nextId: page.nextId }),
    }
  }

  pushUndo(): void {
    this.undoStack.push(this.snapPage())
    if (this.undoStack.length > 60) this.undoStack.shift()
    this.redoStack.length = 0
    this.state.scheduleAutosave()
  }

  applySnap(s: PageSnap): void {
    this.state.doc.cur = DocumentState.clamp(s.pi, 0, this.state.doc.pages.length - 1)
    const pg = this.state.currentPage()
    pg.nodes = DocumentState.deep(s.data.nodes)
    pg.edges = DocumentState.deep(s.data.edges)
    pg.nextId = s.data.nextId
    this.clearSel()
  }

  undo(): void {
    const s = this.undoStack.pop()
    if (!s) return
    this.redoStack.push(this.snapPage())
    this.applySnap(s)
    this.state.scheduleAutosave()
  }

  redo(): void {
    const s = this.redoStack.pop()
    if (!s) return
    this.undoStack.push(this.snapPage())
    this.applySnap(s)
    this.state.scheduleAutosave()
  }
}
