'use strict'

import { DEFAULT_THEME, GRID, PALETTE, iconBg, resolveTheme } from './config'
import { edgePoints } from './geometry'
import type { Bounds, Document, Edge, Node, Page, Settings, Shape } from './types'

interface LegacyEdge extends Partial<Edge> {
  bidir?: boolean
  dashed?: boolean
}

interface LegacyState {
  theme?: string
  nodes?: Node[]
  edges?: LegacyEdge[]
  nextId?: number
}

export interface ProjectData {
  version?: number
  app?: string
  doc?: Document
  settings?: Partial<Settings>
  state?: LegacyState
}

export interface ProjectFile {
  version: number
  app: string
  doc: Document
  settings: Settings
}

const NODE_SIZES: Record<Shape, [number, number]> = {
  rect: [180, 70],
  cylinder: [150, 90],
  diamond: [160, 100],
  circle: [110, 110],
  hex: [170, 80],
  text: [200, 40],
  icon: [120, 92],
  image: [220, 160],
}

const AUTOSAVE_DELAY = 500

export class DocumentState {
  readonly AUTOSAVE_KEY = 'drawwwy.autosave.v1'

  doc: Document
  settings: Settings
  onProjectApplied: (() => void) | null = null

  private autosaveTimer: ReturnType<typeof setTimeout> | null = null
  private autosavePaused = false
  private autosaveReady = true
  private autosaveSuppressed = 0

  constructor() {
    this.doc = { name: 'Tablero sin título', theme: DEFAULT_THEME, pages: [this.blankPage('Página 1')], cur: 0 }
    this.settings = { speed: 0.5, dots: 3, build: false, stagger: 0.45, grid: true }
    if (this.hasAutosave()) {
      this.autosavePaused = true
      this.autosaveReady = false
    }
  }

  blankPage(name: string): Page {
    return { name, nodes: [], edges: [], nextId: 1 }
  }

  currentPage(): Page {
    return this.doc.pages[this.doc.cur]
  }

  getBounds(): Bounds {
    const page = this.currentPage()
    if (page.nodes.length === 0) return { x: 0, y: 0, w: 1280, h: 720 }
    let mx = Infinity, my = Infinity, Mx = -Infinity, My = -Infinity
    const addP = (x: number, y: number): void => {
      if (x < mx) mx = x
      if (x > Mx) Mx = x
      if (y < my) my = y
      if (y > My) My = y
    }
    page.nodes.forEach(n => {
      addP(n.x - n.w / 2, n.y - n.h / 2)
      addP(n.x + n.w / 2, n.y + n.h / 2)
    })
    page.edges.forEach(e => {
      const pts = edgePoints(e, id => this.nodeById(id))
      pts.forEach(p => addP(p.x, p.y))
    })
    mx -= 40; my -= 40; Mx += 40; My += 40
    return { x: mx, y: my, w: Mx - mx, h: My - my }
  }

  centerView(containerWidth: number, containerHeight: number, viewZoom: number): { viewX: number; viewY: number } {
    const b = this.getBounds()
    return {
      viewX: (containerWidth - b.w * viewZoom) / 2 - b.x * viewZoom,
      viewY: (containerHeight - b.h * viewZoom) / 2 - b.y * viewZoom,
    }
  }

  /** Próximo z-index libre en la página: el espacio de apilado es compartido
   *  entre nodos y aristas, así "traer al frente"/"enviar al fondo" puede
   *  intercalar ambos tipos en vez de que las aristas queden siempre debajo. */
  nextZ(page: Page): number {
    let max = -1
    for (const n of page.nodes) if (n.z > max) max = n.z
    for (const e of page.edges) if (e.z > max) max = e.z
    return max + 1
  }

  /** Nodos y aristas de la página combinados en un solo orden de apilado,
   *  del fondo al frente. Fuente única de verdad para dibujado y hit-test. */
  zOrder(page: Page = this.currentPage()): Array<{ type: 'node'; obj: Node } | { type: 'edge'; obj: Edge }> {
    const items: Array<{ type: 'node'; obj: Node } | { type: 'edge'; obj: Edge }> = [
      ...page.nodes.map(obj => ({ type: 'node' as const, obj })),
      ...page.edges.map(obj => ({ type: 'edge' as const, obj })),
    ]
    items.sort((a, b) => a.obj.z - b.obj.z)
    return items
  }

  newNode(shape: Shape, x: number, y: number, extra: Partial<Node> = {}): Node {
    const page = this.currentPage()
    const [w, h] = NODE_SIZES[shape]
    const defaultColor = shape === 'icon' && extra.icon ? (iconBg[extra.icon] || PALETTE[0].c) : PALETTE[0].c
    const n: Node = {
      id: page.nextId++,
      z: this.nextZ(page),
      shape,
      x: DocumentState.snap(x),
      y: DocumentState.snap(y),
      w,
      h,
      label: shape === 'text' ? 'Texto' : (shape === 'icon' || shape === 'image') ? '' : 'Nodo',
      color: defaultColor,
      fill: null,
      fillOpacity: 1,
      borderWidth: 2.5,
      lineStyle: 'solid',
      opacity: 1,
      pulse: false,
      order: page.nodes.length,
      ...extra,
    }
    page.nodes.push(n)
    return n
  }

  newEdge(a: number, b: number, opts: Partial<Edge> = {}): Edge | null {
    const page = this.currentPage()
    const e: Edge = {
      id: page.nextId++,
      z: this.nextZ(page),
      from: a,
      to: b,
      fromSide: null,
      toSide: null,
      route: 'straight',
      waypoints: [],
      label: '',
      animated: true,
      lineStyle: 'solid',
      lineWidth: 2,
      startArrow: false,
      endArrow: true,
      flowDir: 'normal',
      ...opts,
    }
    page.edges.push(e)
    return e
  }

  nodeById(id: number): Node | undefined {
    return this.currentPage().nodes.find(n => n.id === id)
  }

  edgeById(id: number): Edge | undefined {
    return this.currentPage().edges.find(e => e.id === id)
  }

  /** Colores distintos ya presentes en el documento (todas las páginas), en
   *  orden de aparición. Alimenta la sección "Colores recientes" del selector:
   *  no hay historial propio, se deriva de lo que ya está dibujado. */
  usedColors(): string[] {
    const seen = new Set<string>()
    for (const page of this.doc.pages) {
      for (const n of page.nodes) {
        if (n.color) seen.add(n.color.toLowerCase())
        if (n.fill) seen.add(n.fill.toLowerCase())
      }
      for (const e of page.edges) {
        if (e.lineColor) seen.add(e.lineColor.toLowerCase())
        if (e.dotColor) seen.add(e.dotColor.toLowerCase())
      }
    }
    return [...seen]
  }

  serializeProject(): ProjectFile {
    return { version: 3, app: 'drawwwy', doc: this.doc, settings: this.settings }
  }

  setProjectName(name: string): void {
    this.doc.name = name
    this.scheduleAutosave()
  }

  saveAutosave(force = false): void {
    if (!force && !this.canAutosave()) return
    try {
      localStorage.setItem(this.AUTOSAVE_KEY, JSON.stringify(this.serializeProject()))
    } catch (e) {
      console.error('Autosave failed:', e)
    }
  }

  scheduleAutosave(): void {
    if (!this.canAutosave()) return
    if (this.autosaveTimer !== null) clearTimeout(this.autosaveTimer)
    this.autosaveTimer = setTimeout(() => this.saveAutosave(), AUTOSAVE_DELAY)
  }

  clearAutosave(): void {
    try {
      localStorage.removeItem(this.AUTOSAVE_KEY)
    } catch {
      /* noop */
    }
  }

  hasAutosave(): boolean {
    try {
      return localStorage.getItem(this.AUTOSAVE_KEY) !== null
    } catch {
      return false
    }
  }

  loadAutosaveData(): ProjectData | null {
    try {
      const raw = localStorage.getItem(this.AUTOSAVE_KEY)
      return raw ? (JSON.parse(raw) as ProjectData) : null
    } catch {
      return null
    }
  }

  applyProjectData(d: ProjectData): void {
    this.runWithoutAutosave(() => {
      if (d.doc && Array.isArray(d.doc.pages)) {
        this.doc = d.doc
      } else if (d.state && Array.isArray(d.state.nodes)) {
        const legacy = d.state
        const edges = (legacy.edges || []).map(e => ({
          fromSide: null,
          toSide: null,
          route: 'straight',
          waypoints: [],
          ...e,
        })) as Edge[]
        this.doc = {
          name: 'Tablero sin título',
          theme: resolveTheme(legacy.theme),
          cur: 0,
          pages: [{
            ...this.blankPage('Página 1'),
            nodes: legacy.nodes || [],
            edges,
            nextId: legacy.nextId || 999,
          }],
        }
      } else {
        throw new Error('invalid')
      }
      this.doc.pages.forEach(pg => pg.edges.forEach(edge => {
        const e = edge as LegacyEdge
        if (e.endArrow === undefined) {
          e.endArrow = true
          e.startArrow = !!e.bidir
        }
        if (!e.flowDir) e.flowDir = 'normal'
        if (!e.waypoints) e.waypoints = []
        if (!e.route) e.route = 'straight'
        if (!e.lineStyle) e.lineStyle = e.dashed ? 'dashed' : 'solid'
        if (e.lineWidth === undefined) e.lineWidth = 2
      }))
      // Documentos guardados antes de que existiera el z-index compartido: se
      // inicializa preservando el orden visual previo (aristas debajo de todos
      // los nodos) para no alterar diagramas ya guardados al abrirlos.
      this.doc.pages.forEach(pg => {
        const needsInit = pg.nodes.some(n => typeof n.z !== 'number') || pg.edges.some(e => typeof e.z !== 'number')
        if (!needsInit) return
        let z = 0
        pg.edges.forEach(e => { e.z = z++ })
        pg.nodes.forEach(n => { n.z = z++ })
      })
      if (d.settings) Object.assign(this.settings, d.settings)
      // Un documento guardado puede traer un tema ya retirado del sistema de diseño.
      this.doc.theme = resolveTheme(this.doc.theme)
      this.doc.cur = DocumentState.clamp(this.doc.cur || 0, 0, this.doc.pages.length - 1)
      // Autosaves de antes de que existiera el nombre de tablero no lo traen.
      this.doc.name = this.doc.name || 'Tablero sin título'
      this.onProjectApplied?.()
    })
  }

  restoreAutosaveSession(): boolean {
    const d = this.loadAutosaveData()
    if (!d) return false
    this.applyProjectData(d)
    return true
  }

  enableAutosave(): void {
    if (this.autosaveTimer !== null) clearTimeout(this.autosaveTimer)
    this.autosavePaused = false
    this.autosaveReady = true
  }

  suppressAutosave(): void {
    this.autosaveSuppressed++
    if (this.autosaveTimer !== null) clearTimeout(this.autosaveTimer)
  }

  releaseAutosave(): void {
    this.autosaveSuppressed = Math.max(0, this.autosaveSuppressed - 1)
  }

  runWithoutAutosave(fn: () => void): void {
    this.suppressAutosave()
    try {
      fn()
    } finally {
      this.releaseAutosave()
    }
  }

  pauseAutosaveForRestore(): void {
    this.autosavePaused = true
    this.autosaveReady = false
    if (this.autosaveTimer !== null) clearTimeout(this.autosaveTimer)
  }

  private canAutosave(): boolean {
    return this.autosaveReady && !this.autosavePaused && this.autosaveSuppressed === 0
  }

  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  static clamp(v: number, a: number, b: number): number {
    return Math.min(b, Math.max(a, v))
  }

  static smooth(t: number): number {
    t = DocumentState.clamp(t, 0, 1)
    return t * t * (3 - 2 * t)
  }

  static snap(v: number): number {
    return Math.round(v / GRID) * GRID
  }

  static deep<T>(o: T): T {
    return JSON.parse(JSON.stringify(o)) as T
  }

  static hexA(col: string, a: number): string {
    const v = parseInt(col.slice(1), 16)
    return `rgba(${v >> 16 & 255},${v >> 8 & 255},${v & 255},${a})`
  }
}
