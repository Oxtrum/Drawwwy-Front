'use strict'

import { resolveTheme } from './config'
import { edgePoints, pointAt } from './geometry'
import { attachInteraction } from './interaction'
import { render } from './render'
import { SelectionManager } from './selection'
import { DocumentState } from './state'
import type {
  ConnectDragState, DragState, Edge, MarqueeState, Node, Point, ResizeState, Shape,
} from './types'

export interface PanDragState {
  x: number
  y: number
  startX: number
  startY: number
  isRight: boolean
  moved: boolean
}

export interface WpDragState {
  edgeId: number
  idx: number
}

export interface EditBox {
  left: number
  top: number
  width: number
  fontSize: number
  value: string
}

export class CanvasEngine {
  state = new DocumentState()
  sel: SelectionManager

  canvas: HTMLCanvasElement | null = null
  ctx: CanvasRenderingContext2D | null = null
  wrap: HTMLElement | null = null

  mode: 'select' | 'connect' = 'select'
  pendingShape: Shape | null = null
  pendingIcon: string | null = null
  connecting: number | null = null

  drag: DragState | null = null
  resizing: ResizeState | null = null
  wpDrag: WpDragState | null = null
  connectDrag: ConnectDragState | null = null
  marquee: MarqueeState | null = null
  panDrag: PanDragState | null = null
  hoverNode: Node | null = null

  mouse: Point = { x: 0, y: 0 }
  viewX = 0
  viewY = 0
  viewZoom = 0.8

  playing = true
  pasteTimer: ReturnType<typeof setTimeout> | null = null

  editing: Node | Edge | null = null
  editBox: EditBox | null = null

  onChange: (() => void) | null = null
  onEditBoxChange: ((box: EditBox | null) => void) | null = null

  private t0 = performance.now()
  private pausedAt = 0
  private raf = 0
  private detach: (() => void) | null = null

  constructor() {
    this.sel = new SelectionManager(this.state, () => this.notify())
    this.state.onProjectApplied = () => {
      this.sel.undoStack.length = 0
      this.sel.redoStack.length = 0
      this.sel.selN.clear()
      this.sel.selE.clear()
    }
  }

  notify(): void {
    this.onChange?.()
  }

  mount(canvas: HTMLCanvasElement, wrap: HTMLElement): void {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.wrap = wrap
    this.detach = attachInteraction(this)
    this.centerView()
    const loop = (): void => {
      const c = this.ctx
      if (c) render(c, this.now(), this)
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  unmount(): void {
    cancelAnimationFrame(this.raf)
    this.detach?.()
    this.detach = null
    this.canvas = null
    this.ctx = null
    this.wrap = null
  }

  now(): number {
    return this.playing ? (performance.now() - this.t0) / 1000 : this.pausedAt
  }

  togglePlay(): void {
    if (this.playing) {
      this.pausedAt = (performance.now() - this.t0) / 1000
      this.playing = false
    } else {
      this.t0 = performance.now() - this.pausedAt * 1000
      this.playing = true
    }
    this.notify()
  }

  restartAnimation(): void {
    this.t0 = performance.now()
    this.pausedAt = 0
  }

  resizeCanvas(): void {
    const cv = this.canvas
    const wrap = this.wrap
    if (!cv || !wrap) return
    const r = wrap.getBoundingClientRect()
    if (cv.width !== Math.round(r.width) || cv.height !== Math.round(r.height)) {
      cv.width = Math.round(r.width)
      cv.height = Math.round(r.height)
    }
  }

  centerView(): void {
    const wrap = this.wrap
    if (!wrap) return
    const r = wrap.getBoundingClientRect()
    if (r.width === 0) { setTimeout(() => this.centerView(), 50); return }
    const v = this.state.centerView(r.width, r.height, this.viewZoom)
    this.viewX = v.viewX
    this.viewY = v.viewY
  }

  setMode(mode: 'select' | 'connect'): void {
    this.mode = mode
    this.connecting = null
    this.pendingShape = null
    this.pendingIcon = null
    this.notify()
  }

  selectShape(shape: Shape | null): void {
    this.pendingShape = shape
    this.pendingIcon = null
    this.mode = 'select'
    this.notify()
  }

  selectIcon(icon: string | null): void {
    this.pendingIcon = icon
    this.pendingShape = null
    this.mode = 'select'
    this.notify()
  }

  setTheme(theme: string): void {
    this.state.doc.theme = resolveTheme(theme)
    this.state.scheduleAutosave()
    this.notify()
  }

  updateSettings(patch: Partial<typeof this.state.settings>): void {
    Object.assign(this.state.settings, patch)
    this.state.scheduleAutosave()
    this.notify()
  }

  updateNode(id: number, patch: Partial<Node>): void {
    const n = this.state.nodeById(id)
    if (!n) return
    this.sel.pushUndo()
    Object.assign(n, patch)
    this.state.scheduleAutosave()
    this.notify()
  }

  updateEdge(id: number, patch: Partial<Edge>): void {
    const e = this.state.edgeById(id)
    if (!e) return
    this.sel.pushUndo()
    Object.assign(e, patch)
    this.state.scheduleAutosave()
    this.notify()
  }

  addPage(): void {
    this.state.doc.pages.push(this.state.blankPage('Página ' + (this.state.doc.pages.length + 1)))
    this.state.doc.cur = this.state.doc.pages.length - 1
    this.sel.clearSel()
    this.state.scheduleAutosave()
    this.notify()
  }

  gotoPage(i: number): void {
    this.state.doc.cur = DocumentState.clamp(i, 0, this.state.doc.pages.length - 1)
    this.sel.clearSel()
    this.state.scheduleAutosave()
    this.notify()
  }

  removePage(i: number): void {
    if (this.state.doc.pages.length <= 1) return
    this.state.doc.pages.splice(i, 1)
    this.state.doc.cur = DocumentState.clamp(this.state.doc.cur, 0, this.state.doc.pages.length - 1)
    this.sel.clearSel()
    this.state.scheduleAutosave()
    this.notify()
  }

  renamePage(i: number, name: string): void {
    const pg = this.state.doc.pages[i]
    if (!pg) return
    pg.name = name
    this.state.scheduleAutosave()
    this.notify()
  }

  beginEdit(tgt: Node | Edge): void {
    this.editing = tgt
    let cx: number
    let cyy: number
    let w: number
    if ('from' in tgt) {
      const m = pointAt(edgePoints(tgt, id => this.state.nodeById(id)), 0.5)
      cx = m.x; cyy = m.y; w = 170
    } else {
      cx = tgt.x
      cyy = tgt.shape === 'image' ? tgt.y + tgt.h / 2 + 14 : tgt.y
      w = Math.max(120, tgt.w)
    }
    const screenCX = cx * this.viewZoom + this.viewX
    const screenCY = cyy * this.viewZoom + this.viewY
    this.editBox = {
      left: screenCX - (w / 2) * this.viewZoom,
      top: screenCY - 16 * this.viewZoom,
      width: w * this.viewZoom,
      fontSize: Math.max(12, 15 * this.viewZoom),
      value: tgt.label || '',
    }
    this.onEditBoxChange?.(this.editBox)
  }

  setEditValue(v: string): void {
    if (this.editBox) this.editBox.value = v
  }

  commitEdit(): void {
    if (!this.editing || !this.editBox) return
    const v = this.editBox.value
    if (this.editing.label !== v) this.sel.pushUndo()
    this.editing.label = v
    this.editing = null
    this.editBox = null
    this.onEditBoxChange?.(null)
    this.state.scheduleAutosave()
    this.notify()
  }

  cancelEdit(): void {
    this.editing = null
    this.editBox = null
    this.onEditBoxChange?.(null)
  }

  zoomBy(factor: number): void {
    const cv = this.canvas
    if (!cv) return
    const screenX = cv.width / 2
    const screenY = cv.height / 2
    const worldX = (screenX - this.viewX) / this.viewZoom
    const worldY = (screenY - this.viewY) / this.viewZoom
    this.viewZoom = DocumentState.clamp(this.viewZoom * factor, 0.1, 5)
    this.viewX = screenX - worldX * this.viewZoom
    this.viewY = screenY - worldY * this.viewZoom
    this.notify()
  }

  serialize(): ReturnType<DocumentState['serializeProject']> {
    return this.state.serializeProject()
  }
}
