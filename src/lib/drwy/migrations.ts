import type { ProjectData } from '../../canvas/state'

/**
 * Punto único para migrar documentos guardados antes de una futura versión
 * del formato interno. DocumentState todavía conserva la normalización legacy
 * de nodes/edges, por lo que esta primera versión solo completa defaults.
 */
export function migrateProjectData(data: ProjectData): ProjectData {
  if (data.doc && Array.isArray(data.doc.pages)) {
    return {
      version: data.version ?? 3,
      app: data.app ?? 'drawwwy',
      doc: data.doc,
      settings: data.settings,
    }
  }
  return data
}
