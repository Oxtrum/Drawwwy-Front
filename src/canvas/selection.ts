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
    const es = page.edges.filter(e => ids.has(e.from) && ids.has(e.to)).map(e => DocumentState.deep(e))
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
    if (!clip || !clip.nodes.length) return
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
      c.from = map[e.from]
      c.to = map[e.to]
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
