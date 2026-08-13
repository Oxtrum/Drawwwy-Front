import { HocuspocusProvider } from '@hocuspocus/provider'
import * as Y from 'yjs'
import type { CanvasEngine } from '../../canvas/engine'
import type { ProjectData } from '../../canvas/state'
import { collaboratorColor, type ActiveCollaborationTarget, type CollaboratorPresence } from './presence'

export type CollaborationStatus = 'connecting' | 'connected' | 'disconnected'

type JsonRecord = Record<string, unknown>

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T }

function equal(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function childMap(parent: Y.Map<unknown>, key: string): Y.Map<unknown> {
  const current = parent.get(key)
  if (current instanceof Y.Map) return current
  const created = new Y.Map<unknown>()
  parent.set(key, created)
  return created
}

function syncFields(target: Y.Map<unknown>, source: JsonRecord, omitted: string[] = []): void {
  const keys = new Set(Object.keys(source).filter(key => !omitted.includes(key) && source[key] !== undefined))
  for (const key of keys) {
    const value = clone(source[key])
    if (!equal(target.get(key), value)) target.set(key, value)
  }
  Array.from(target.keys()).forEach(key => { if (!keys.has(key)) target.delete(key) })
}

function syncEntities(target: Y.Map<unknown>, entities: JsonRecord[]): void {
  const ids = new Set(entities.map(entity => String(entity.collabId)))
  for (const entity of entities) {
    const id = String(entity.collabId)
    const current = target.get(id)
    const entry = current instanceof Y.Map ? current : new Y.Map<unknown>()
    if (!(current instanceof Y.Map)) target.set(id, entry)
    syncFields(entry, entity)
  }
  Array.from(target.keys()).forEach(key => { if (!ids.has(key)) target.delete(key) })
}

function readFields(source: Y.Map<unknown>): JsonRecord {
  const result: JsonRecord = {}
  source.forEach((value, key) => { if (!(value instanceof Y.Map)) result[key] = clone(value) })
  return result
}

function readEntities(source: Y.Map<unknown>): JsonRecord[] {
  return Array.from(source.values())
    .filter((value): value is Y.Map<unknown> => value instanceof Y.Map)
    .map(readFields)
}

/**
 * Adaptador local de prueba: convierte el documento del lienzo en mapas Yjs
 * por página, nodo y arista. Así modificaciones concurrentes de entidades o
 * propiedades distintas se fusionan sin intercambiar snapshots completos.
 */
export class LocalYjsCollaboration {
  private readonly ydoc = new Y.Doc()
  private readonly root = this.ydoc.getMap<unknown>('drawwwy')
  private readonly origin = Symbol('drawwwy-local-engine')
  private readonly previousOnDocumentChange: (() => void) | null
  private readonly previousOnPointerMove: ((point: { x: number; y: number }) => void) | null
  private readonly previousOnInteractionChange: ((target: ActiveCollaborationTarget | null) => void) | null
  private provider: HocuspocusProvider
  private ready = false
  private applyingRemote = false
  private pendingRemoteDocument = false
  private readonly engine: CanvasEngine
  private cursorTimer: ReturnType<typeof setTimeout> | null = null
  private latestCursor: { x: number; y: number } | null = null
  private readonly user: { name: string; color: string }
  private readonly onPresence: (collaborators: CollaboratorPresence[]) => void

  constructor(
    engine: CanvasEngine,
    url: string,
    projectId: number,
    token: string,
    userName: string,
    onStatus: (status: CollaborationStatus) => void,
    onPresence: (collaborators: CollaboratorPresence[]) => void,
  ) {
    this.engine = engine
    this.previousOnDocumentChange = engine.onDocumentChange
    this.previousOnPointerMove = engine.onPointerMove
    this.previousOnInteractionChange = engine.onInteractionChange
    this.user = { name: userName || 'Colaborador', color: collaboratorColor(this.ydoc.clientID) }
    this.onPresence = onPresence
    this.provider = new HocuspocusProvider({
      url,
      name: `project-${projectId}`,
      document: this.ydoc,
      token,
      flushDelay: 40,
      onStatus: event => onStatus(event.status as CollaborationStatus),
      onSynced: ({ state }) => { if (state) this.initialize() },
      onAwarenessChange: () => this.readPresence(),
    })
    this.provider.awareness?.setLocalStateField('user', this.user)
    this.root.observeDeep((_, transaction) => {
      if (!this.ready || transaction.origin === this.origin) return
      if (this.hasLocalInteraction()) {
        this.pendingRemoteDocument = true
        return
      }
      this.applyRemoteDocument()
    })
    engine.onDocumentChange = () => {
      this.previousOnDocumentChange?.()
      if (this.ready && !this.applyingRemote) this.syncFromEngine()
    }
    engine.onPointerMove = point => {
      this.previousOnPointerMove?.(point)
      this.publishCursor(point)
    }
    engine.onInteractionChange = target => {
      this.previousOnInteractionChange?.(target)
      this.provider.awareness?.setLocalStateField('activeTarget', target)
      if (!target && this.pendingRemoteDocument) {
        this.pendingRemoteDocument = false
        this.applyRemoteDocument()
      }
    }
  }

  destroy(): void {
    this.engine.onDocumentChange = this.previousOnDocumentChange
    this.engine.onPointerMove = this.previousOnPointerMove
    this.engine.onInteractionChange = this.previousOnInteractionChange
    if (this.cursorTimer) clearTimeout(this.cursorTimer)
    this.provider.destroy()
    this.ydoc.destroy()
  }

  private initialize(): void {
    if (this.ready) return
    this.ready = true
    if (this.root.size === 0) this.syncFromEngine()
    else this.applyRemoteDocument()
    this.readPresence()
  }

  private publishCursor(point: { x: number; y: number }): void {
    this.latestCursor = point
    if (this.cursorTimer) return
    this.cursorTimer = setTimeout(() => {
      this.cursorTimer = null
      const pageId = this.engine.state.currentPage().collabId
      if (!pageId || !this.latestCursor) return
      this.provider.awareness?.setLocalStateField('cursor', { ...this.latestCursor, pageId })
    }, 40)
  }

  private readPresence(): void {
    const states = this.provider.awareness?.getStates()
    if (!states) return
    const collaborators: CollaboratorPresence[] = []
    states.forEach((state, clientId) => {
      const user = state.user as { name?: unknown; color?: unknown } | undefined
      if (!user || typeof user.name !== 'string' || typeof user.color !== 'string') return
      const cursor = state.cursor as { x?: unknown; y?: unknown; pageId?: unknown } | undefined
      const active = state.activeTarget as { pageId?: unknown; type?: unknown; id?: unknown } | null | undefined
      collaborators.push({
        clientId,
        name: user.name,
        color: user.color,
        isSelf: clientId === this.ydoc.clientID,
        cursor: cursor && typeof cursor.x === 'number' && typeof cursor.y === 'number' && typeof cursor.pageId === 'string'
          ? { x: cursor.x, y: cursor.y, pageId: cursor.pageId }
          : undefined,
        activeTarget: active && typeof active.pageId === 'string' && (active.type === 'node' || active.type === 'edge') && typeof active.id === 'string'
          ? { pageId: active.pageId, type: active.type, id: active.id }
          : undefined,
      })
    })
    collaborators.sort((left, right) => Number(right.isSelf) - Number(left.isSelf) || left.name.localeCompare(right.name))
    this.onPresence(collaborators)
    this.engine.setRemoteCollaborators(collaborators)
  }

  private syncFromEngine(): void {
    const project = this.engine.serialize()
    this.ydoc.transact(() => {
      const doc = childMap(this.root, 'doc')
      const settings = childMap(this.root, 'settings')
      const pages = childMap(this.root, 'pages')
      const sourceDoc = project.doc as unknown as JsonRecord
      syncFields(doc, sourceDoc, ['pages', 'cur'])
      syncFields(settings, project.settings as unknown as JsonRecord, ['grid'])

      const sourcePages = project.doc.pages as unknown as JsonRecord[]
      const pageIds = new Set(sourcePages.map(page => String(page.collabId)))
      for (const page of sourcePages) {
        const id = String(page.collabId)
        const current = pages.get(id)
        const entry = current instanceof Y.Map ? current : new Y.Map<unknown>()
        if (!(current instanceof Y.Map)) pages.set(id, entry)
        syncFields(entry, page, ['nodes', 'edges'])
        syncEntities(childMap(entry, 'nodes'), page.nodes as JsonRecord[])
        syncEntities(childMap(entry, 'edges'), page.edges as JsonRecord[])
      }
      Array.from(pages.keys()).forEach(key => { if (!pageIds.has(key)) pages.delete(key) })
      const order = sourcePages.map(page => String(page.collabId))
      if (!equal(this.root.get('pageOrder'), order)) this.root.set('pageOrder', order)
    }, this.origin)
  }

  private hasLocalInteraction(): boolean {
    return Boolean(this.engine.drag || this.engine.resizing || this.engine.wpDrag || this.engine.connectDrag || this.engine.placement || this.engine.editing)
  }

  private applyRemoteDocument(): void {
    const doc = this.root.get('doc')
    const settings = this.root.get('settings')
    const pages = this.root.get('pages')
    if (!(doc instanceof Y.Map) || !(settings instanceof Y.Map) || !(pages instanceof Y.Map)) return
    const requestedOrder = this.root.get('pageOrder')
    const order = Array.isArray(requestedOrder) ? requestedOrder.map(String) : Array.from(pages.keys())
    const materializedPages = order
      .map(id => pages.get(id))
      .filter((page): page is Y.Map<unknown> => page instanceof Y.Map)
      .map(page => ({ ...readFields(page), nodes: readEntities(childMap(page, 'nodes')), edges: readEntities(childMap(page, 'edges')) }))
    if (materializedPages.length === 0) return

    this.applyingRemote = true
    try {
      this.engine.applyProjectData({
        doc: { ...readFields(doc), pages: materializedPages, cur: this.engine.state.doc.cur },
        settings: { ...this.engine.state.settings, ...readFields(settings), grid: this.engine.state.settings.grid },
      } as unknown as ProjectData, true)
    } finally {
      this.applyingRemote = false
    }
  }
}

export function localCollaborationConfig(): { url: string } | null {
  const url = import.meta.env.VITE_COLLAB_URL?.trim()
  if (!url) return null
  return { url }
}
