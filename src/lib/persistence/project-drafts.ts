import type { ProjectData } from '../../canvas/state'

const DATABASE_NAME = 'drawwwy.persistence'
const DATABASE_VERSION = 1
const DRAFT_STORE = 'project-drafts'

export interface DraftProjectIdentity {
  id: string
  source: 'guest' | 'remote'
  remoteId?: number
  publicId?: string | null
}

export interface ProjectDraft {
  key: string
  projectId: string
  source: DraftProjectIdentity['source']
  baseRevision: number | null
  document: ProjectData
  contentHash: string
  updatedAt: string
  pending: boolean
}

let databasePromise: Promise<IDBDatabase> | null = null

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise
  databasePromise = new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('IndexedDB no esta disponible'))
      return
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(DRAFT_STORE)) {
        const store = database.createObjectStore(DRAFT_STORE, { keyPath: 'key' })
        store.createIndex('updatedAt', 'updatedAt')
      }
    }
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close()
        databasePromise = null
      }
      resolve(request.result)
    }
    request.onerror = () => {
      databasePromise = null
      reject(request.error ?? new Error('No se pudo abrir IndexedDB'))
    }
    request.onblocked = () => {
      databasePromise = null
      reject(new Error('La actualizacion de IndexedDB esta bloqueada'))
    }
  })
  return databasePromise
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Fallo una operacion de IndexedDB'))
  })
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Fallo una transaccion de IndexedDB'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Se aborto una transaccion de IndexedDB'))
  })
}

export function projectDraftKey(project: DraftProjectIdentity): string {
  if (project.source === 'guest') return `guest:${project.id}`
  return `remote:${project.publicId || project.remoteId || project.id}`
}

function canonicalJSON(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(item => canonicalJSON(item ?? null)).join(',')}]`
  const record = value as Record<string, unknown>
  const entries = Object.keys(record)
    .filter(key => record[key] !== undefined)
    .sort()
    .map(key => `${JSON.stringify(key)}:${canonicalJSON(record[key])}`)
  return `{${entries.join(',')}}`
}

export async function projectDataHash(document: ProjectData): Promise<string> {
  const serialized = canonicalJSON(document)
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(serialized))
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
  }

  // Fallback for restricted browser contexts. It is used only to detect
  // unchanged local content, not as a security primitive.
  let hash = 2166136261
  for (let index = 0; index < serialized.length; index++) {
    hash ^= serialized.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export async function loadProjectDraft(project: DraftProjectIdentity): Promise<ProjectDraft | null> {
  const database = await openDatabase()
  const transaction = database.transaction(DRAFT_STORE, 'readonly')
  const result = await requestResult(transaction.objectStore(DRAFT_STORE).get(projectDraftKey(project)))
  return (result as ProjectDraft | undefined) ?? null
}

export async function saveProjectDraft(
  project: DraftProjectIdentity,
  document: ProjectData,
  options: { baseRevision?: number | null; pending: boolean },
): Promise<ProjectDraft> {
  const draft: ProjectDraft = {
    key: projectDraftKey(project),
    projectId: project.id,
    source: project.source,
    baseRevision: options.baseRevision ?? null,
    document: JSON.parse(JSON.stringify(document)) as ProjectData,
    contentHash: await projectDataHash(document),
    updatedAt: new Date().toISOString(),
    pending: options.pending,
  }
  const database = await openDatabase()
  const transaction = database.transaction(DRAFT_STORE, 'readwrite')
  transaction.objectStore(DRAFT_STORE).put(draft)
  await transactionComplete(transaction)
  return draft
}

export async function deleteProjectDraft(project: DraftProjectIdentity): Promise<void> {
  const database = await openDatabase()
  const transaction = database.transaction(DRAFT_STORE, 'readwrite')
  transaction.objectStore(DRAFT_STORE).delete(projectDraftKey(project))
  await transactionComplete(transaction)
}
