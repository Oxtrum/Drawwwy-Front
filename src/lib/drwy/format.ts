import type { ProjectData, ProjectFile } from '../../canvas/state'
import type { Edge, Node, Page, Shape } from '../../canvas/types'
import { migrateProjectData } from './migrations'

export const DRWY_FORMAT = 'drwy' as const
export const DRWY_FORMAT_VERSION = 1 as const
export const DRWY_MIME = 'application/vnd.drawwwy.diagram+json'
export const DRWY_MAX_FILE_SIZE = 20 * 1024 * 1024

export interface DrwyFile {
  format: typeof DRWY_FORMAT
  formatVersion: typeof DRWY_FORMAT_VERSION
  app: 'drawwwy'
  exportedAt: string
  title?: string
  document: ProjectFile
}

export interface ParsedDrwyFile {
  file: DrwyFile | null
  projectData: ProjectData
  title?: string
}

const SHAPES: Shape[] = ['rect', 'cylinder', 'diamond', 'circle', 'hex', 'text', 'icon', 'image']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function invalid(message: string): Error {
  return new Error(`DRWY_INVALID: ${message}`)
}

function validateNode(value: unknown, index: number): value is Node {
  if (!isRecord(value)) throw invalid(`nodo ${index} inválido`)
  if (!isFiniteNumber(value.id) || !Number.isInteger(value.id)) throw invalid(`id inválido en nodo ${index}`)
  if (typeof value.shape !== 'string' || !SHAPES.includes(value.shape as Shape)) throw invalid(`forma inválida en nodo ${index}`)
  for (const key of ['x', 'y', 'w', 'h']) {
    if (!isFiniteNumber(value[key]) || (key === 'w' || key === 'h') && value[key] <= 0) {
      throw invalid(`dimensión inválida en nodo ${index}`)
    }
  }
  if (typeof value.label !== 'string') throw invalid(`etiqueta inválida en nodo ${index}`)
  return true
}

function validateEdge(value: unknown, index: number): value is Edge {
  if (!isRecord(value)) throw invalid(`edge ${index} inválido`)
  for (const key of ['id', 'from', 'to']) {
    if (!isFiniteNumber(value[key]) || !Number.isInteger(value[key])) throw invalid(`${key} inválido en edge ${index}`)
  }
  return true
}

function validatePage(value: unknown, index: number): value is Page {
  if (!isRecord(value)) throw invalid(`página ${index} inválida`)
  if (typeof value.name !== 'string') throw invalid(`nombre inválido en página ${index}`)
  if (!Array.isArray(value.nodes) || !Array.isArray(value.edges)) throw invalid(`contenido inválido en página ${index}`)
  if (!isFiniteNumber(value.nextId) || !Number.isInteger(value.nextId)) throw invalid(`nextId inválido en página ${index}`)
  value.nodes.forEach((node, nodeIndex) => validateNode(node, nodeIndex))
  value.edges.forEach((edge, edgeIndex) => validateEdge(edge, edgeIndex))
  const nodeIds = new Set(value.nodes.map(node => (node as Node).id))
  value.edges.forEach((edge, edgeIndex) => {
    const e = edge as Edge
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) throw invalid(`edge ${edgeIndex} referencia un nodo inexistente`)
  })
  return true
}

function validateProjectData(value: unknown): value is ProjectData {
  if (!isRecord(value)) throw invalid('documento ausente')
  if (isRecord(value.doc)) {
    if (typeof value.doc.theme !== 'string' || !Array.isArray(value.doc.pages)) throw invalid('doc inválido')
    if (value.doc.pages.length === 0) throw invalid('el documento no contiene páginas')
    value.doc.pages.forEach((page, index) => validatePage(page, index))
    if (!isFiniteNumber(value.doc.cur) || !Number.isInteger(value.doc.cur) || value.doc.cur < 0 || value.doc.cur >= value.doc.pages.length) {
      throw invalid('página actual inválida')
    }
    if (value.settings !== undefined && !isRecord(value.settings)) throw invalid('settings inválido')
    return true
  }
  if (isRecord(value.state) && Array.isArray(value.state.nodes)) {
    return true
  }
  throw invalid('estructura de documento no reconocida')
}

export function createDrwyFile(document: ProjectFile, title?: string): DrwyFile {
  const file: DrwyFile = {
    format: DRWY_FORMAT,
    formatVersion: DRWY_FORMAT_VERSION,
    app: 'drawwwy',
    exportedAt: new Date().toISOString(),
    document: JSON.parse(JSON.stringify(document)) as ProjectFile,
  }
  if (title?.trim()) file.title = title.trim()
  return file
}

export function parseDrwyObject(value: unknown): ParsedDrwyFile {
  if (!isRecord(value)) throw invalid('el archivo debe contener un objeto JSON')

  if (value.format === DRWY_FORMAT) {
    if (value.formatVersion !== DRWY_FORMAT_VERSION) throw invalid(`versión ${String(value.formatVersion)} no soportada`)
    if (value.app !== 'drawwwy') throw invalid('la aplicación del archivo no es Drawwy')
    if (!isRecord(value.document)) throw invalid('document no encontrado')
    validateProjectData(value.document)
    const projectData = migrateProjectData(value.document as unknown as ProjectData)
    return {
      file: value as unknown as DrwyFile,
      projectData,
      title: typeof value.title === 'string' ? value.title : undefined,
    }
  }

  // Compatibilidad con exportaciones JSON anteriores al formato .drwy.
  validateProjectData(value)
  return {
    file: null,
    projectData: migrateProjectData(value as unknown as ProjectData),
  }
}

export function parseDrwyText(text: string): ParsedDrwyFile {
  if (text.length > DRWY_MAX_FILE_SIZE) throw invalid('el archivo supera el límite de tamaño')
  try {
    return parseDrwyObject(JSON.parse(text) as unknown)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('DRWY_INVALID:')) throw error
    throw invalid('JSON inválido')
  }
}

export function sanitizeFilename(value: string, fallback = 'diagrama'): string {
  const clean = value.trim().replace(/[<>:"/\\|?*]/g, '-').replace(/\p{Cc}/gu, '-').replace(/[. ]+$/g, '')
  return clean || fallback
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
