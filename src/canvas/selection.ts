'use strict'

import { GRID } from './config'
import { DocumentState } from './state'
import { newCollaborationId } from '../lib/collaboration/identity'
import type { Edge, Node, Page, SingleSelection } from './types'

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

interface ZItem {
  id: number
  z: number
  obj: Node | Edge
}

/** Nodos y aristas de la página como una sola lista ordenada por z (fondo a
 *  frente): "traer al frente"/"enviar al fondo" opera sobre este orden único
 *  en vez de reordenar cada arreglo por separado, para que una arista pueda
 *  quedar por encima o por debajo de un nodo. Los IDs son únicos entre
 *  ambos tipos dentro de una página (comparten el contador `nextId`). */
function mergedItems(page: Page): ZItem[] {
  const items: ZItem[] = [
    ...page.nodes.map(n => ({ id: n.id, z: n.z, obj: n as Node | Edge })),
    ...page.edges.map(e => ({ id: e.id, z: e.z, obj: e as Node | Edge })),
  ]
  items.sort((a, b) => a.z - b.z)
  return items
}

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
    this.expandGroups()
    this.notify()
  }

  toggleSel(type: 'node' | 'edge', id: number): void {
    const s = type === 'node' ? this.selN : this.selE
    const obj = type === 'node' ? this.state.nodeById(id) : this.state.edgeById(id)
    // Un miembro de grupo arrastra a sus compañeros en ambos sentidos: shift+click
    // sobre él suma o resta el grupo completo, nunca lo parte.
    if (obj?.group !== undefined) {
      const members = this.groupMembers(obj.group)
      if (s.has(id)) {
        members.nodes.forEach(n => this.selN.delete(n.id))
        members.edges.forEach(e => this.selE.delete(e.id))
      } else {
        members.nodes.forEach(n => this.selN.add(n.id))
        members.edges.forEach(e => this.selE.add(e.id))
      }
    } else if (s.has(id)) s.delete(id)
    else s.add(id)
    this.notify()
  }

  private groupMembers(gid: number): { nodes: Node[]; edges: Edge[] } {
    const page = this.state.currentPage()
    return {
      nodes: page.nodes.filter(n => n.group === gid),
      edges: page.edges.filter(e => e.group === gid),
    }
  }

  /** Ids de grupo tocados por la selección actual. */
  selectedGroups(): Set<number> {
    const gs = new Set<number>()
    const page = this.state.currentPage()
    for (const n of page.nodes) if (n.group !== undefined && this.selN.has(n.id)) gs.add(n.group)
    for (const e of page.edges) if (e.group !== undefined && this.selE.has(e.id)) gs.add(e.group)
    return gs
  }

  /** Completa la selección con el resto de los miembros de cada grupo tocado.
   *  Se llama después de cualquier selección hecha por el usuario (click,
   *  shift+click, marquee) para sostener la invariante "un grupo se selecciona
   *  entero o no se selecciona". Al ser planos los grupos, una sola pasada basta. */
  expandGroups(): void {
    const gs = this.selectedGroups()
    if (!gs.size) return
    const page = this.state.currentPage()
    for (const n of page.nodes) if (n.group !== undefined && gs.has(n.group)) this.selN.add(n.id)
    for (const e of page.edges) if (e.group !== undefined && gs.has(e.group)) this.selE.add(e.id)
  }

  /** Agrupar aporta algo si hay 2+ elementos y no son ya exactamente un grupo. */
  canGroup(): boolean {
    const page = this.state.currentPage()
    const nodes = page.nodes.filter(n => this.selN.has(n.id))
    const edges = page.edges.filter(e => this.selE.has(e.id))
    if (nodes.length + edges.length < 2) return false
    const first = nodes[0]?.group ?? edges[0]?.group
    if (first === undefined) return true
    const members = this.groupMembers(first)
    return !(nodes.every(n => n.group === first) && edges.every(e => e.group === first)
      && members.nodes.length === nodes.length && members.edges.length === edges.length)
  }

  groupSel(): void {
    if (!this.canGroup()) return
    this.pushUndo()
    const page = this.state.currentPage()
    const gid = page.nextId++
    // Una arista con ambos extremos dentro del grupo entra aunque no estuviera
    // seleccionada: ya se movía con ellos, y así también se borra y copia con ellos.
    for (const e of page.edges) if (this.selN.has(e.from) && this.selN.has(e.to)) this.selE.add(e.id)
    for (const n of page.nodes) if (this.selN.has(n.id)) n.group = gid
    for (const e of page.edges) if (this.selE.has(e.id)) e.group = gid
    this.state.scheduleAutosave()
    this.notify()
  }

  canUngroup(): boolean {
    return this.selectedGroups().size > 0
  }

  ungroupSel(): void {
    const gs = this.selectedGroups()
    if (!gs.size) return
    this.pushUndo()
    const page = this.state.currentPage()
    for (const n of page.nodes) if (n.group !== undefined && gs.has(n.group)) n.group = undefined
    for (const e of page.edges) if (e.group !== undefined && gs.has(e.group)) e.group = undefined
    this.state.scheduleAutosave()
    this.notify()
  }

  /** Disuelve los grupos que quedaron con menos de dos miembros: un grupo de
   *  uno no agrupa nada y dejaría al sobreviviente con un contorno fantasma. */
  private pruneGroups(): void {
    const page = this.state.currentPage()
    const count = new Map<number, number>()
    const bump = (g?: number): void => { if (g !== undefined) count.set(g, (count.get(g) ?? 0) + 1) }
    page.nodes.forEach(n => bump(n.group))
    page.edges.forEach(e => bump(e.group))
    const dead = (g?: number): boolean => g !== undefined && (count.get(g) ?? 0) < 2
    page.nodes.forEach(n => { if (dead(n.group)) n.group = undefined })
    page.edges.forEach(e => { if (dead(e.group)) e.group = undefined })
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
    // Los grupos del clip se re-numeran: la copia es un grupo nuevo e
    // independiente, y el id original podría chocar con otro de esta página.
    const gmap: Record<number, number> = {}
    const regroup = (g?: number): number | undefined => {
      if (g === undefined) return undefined
      if (gmap[g] === undefined) gmap[g] = page.nextId++
      return gmap[g]
    }
    this.selN.clear()
    this.selE.clear()
    clip.nodes.forEach(n => {
      const c = DocumentState.deep(n)
      map[n.id] = c.id = page.nextId++
      c.collabId = newCollaborationId()
      c.group = regroup(n.group)
      c.z = this.state.nextZ(page)
      c.x += GRID
      c.y += GRID
      c.order = page.nodes.length
      page.nodes.push(c)
      this.selN.add(c.id)
    })
    clip.edges.forEach(e => {
      const c = DocumentState.deep(e)
      c.id = page.nextId++
      c.collabId = newCollaborationId()
      c.group = regroup(e.group)
      c.z = this.state.nextZ(page)
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

  private selectedIds(): Set<number> {
    return new Set<number>([...this.selN, ...this.selE])
  }

  canArrange(dir: ArrangeDir): boolean {
    const ids = this.selectedIds()
    if (!ids.size) return false
    const page = this.state.currentPage()
    return arrangeMoves(mergedItems(page), ids, dir)
  }

  arrange(dir: ArrangeDir): void {
    if (!this.canArrange(dir)) return
    this.pushUndo()
    const page = this.state.currentPage()
    const ordered = withId(mergedItems(page), this.selectedIds(), dir)
    ordered.forEach((item, i) => { item.obj.z = i })
    this.state.scheduleAutosave()
    this.notify()
  }

  deleteSel(): void {
    if (!this.selN.size && !this.selE.size) return
    this.pushUndo()
    const page = this.state.currentPage()
    page.edges = page.edges.filter(e => !this.selE.has(e.id) && !this.selN.has(e.from) && !this.selN.has(e.to))
    page.nodes = page.nodes.filter(n => !this.selN.has(n.id))
    this.pruneGroups()
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
