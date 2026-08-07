import { create } from 'zustand'
import { ApiError } from '../api/client'
import * as projectsApi from '../api/projects-api'
import { createBlankProjectFile } from '../drwy/document'
import { createDrwyFile, parseDrwyObject } from '../drwy/format'
import { useAuthStore } from './auth-store'
import { useThemeStore } from './theme-store'
import type { ProjectData, ProjectFile } from '../../canvas/state'

export type ProjectSource = 'guest' | 'remote'

export interface Project {
  id: string
  remoteId?: number
  source: ProjectSource
  name: string
  createdAt: string
  updatedAt: string
  thumbnailUrl?: string | null
  revision?: number
  owner?: projectsApi.RemoteProject['owner']
  access?: projectsApi.RemoteProject['access']
  capabilities?: projectsApi.RemoteProject['capabilities']
}

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict'
export type SaveResult = 'saved' | 'conflict' | 'error' | 'idle'

const GUEST_KEY = 'drawwwy.projects.guest'
const GUEST_DOC_PREFIX = 'drawwwy.projectDoc.guest.'
const UNTITLED = 'Sin titulo'

function loadGuestProjects(): Project[] {
  try {
    const raw = localStorage.getItem(GUEST_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed as Project[] : []
  } catch {
    return []
  }
}

function persistGuestProjects(projects: Project[]): void {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(projects.filter(p => p.source === 'guest')))
  } catch {
    /* noop */
  }
}

function guestDocKey(id: string): string {
  return `${GUEST_DOC_PREFIX}${id}`
}

function toProject(remote: projectsApi.RemoteProject): Project {
  return {
    id: String(remote.id),
    remoteId: remote.id,
    source: 'remote',
    name: remote.name,
    createdAt: remote.created_at,
    updatedAt: remote.updated_at,
    thumbnailUrl: remote.thumbnail_url ?? null,
    revision: remote.revision,
    owner: remote.owner,
    access: remote.access,
    capabilities: remote.capabilities,
  }
}

function remoteProjectData(remote: projectsApi.RemoteProject): ProjectData {
  if (remote.doc === undefined) throw new Error('El servidor no devolvio el documento del tablero')
  return parseDrwyObject(remote.doc).projectData
}

function tokenOrNull(): string | null {
  const auth = useAuthStore.getState()
  return auth.status === 'authenticated' ? auth.accessToken : null
}

function currentTheme(): string {
  return useThemeStore.getState().theme
}

interface ProjectStore {
  projects: Project[]
  loading: boolean
  error: string | null
  activeProject: Project | null
  activeProjectData: ProjectData | null
  conflictDocument: ProjectFile | null
  saveStatus: SaveStatus
  loadProjects: () => Promise<void>
  createProject: (name?: string, thumbnailUrl?: string | null) => Promise<Project>
  deleteProject: (id: string) => Promise<void>
  renameProject: (id: string, name: string) => Promise<void>
  duplicateProject: (id: string) => Promise<Project | null>
  openProject: (id: string) => Promise<ProjectData | null>
  saveActiveProject: (document: ProjectFile, name?: string, thumbnailUrl?: string | null) => Promise<SaveResult>
  saveDocumentAsRemote: (document: ProjectFile, name?: string, thumbnailUrl?: string | null) => Promise<Project | null>
  reloadAfterConflict: () => Promise<ProjectData | null>
  saveConflictAsCopy: () => Promise<Project | null>
  markDirty: () => void
  clearActiveProject: () => void
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: loadGuestProjects(),
  loading: false,
  error: null,
  activeProject: null,
  activeProjectData: null,
  conflictDocument: null,
  saveStatus: 'idle',

  loadProjects: async () => {
    const token = tokenOrNull()
    if (!token) {
      set({ projects: loadGuestProjects(), loading: false, error: null })
      return
    }
    set({ loading: true, error: null })
    try {
      const remote = await projectsApi.listProjects(token)
      const projects = Array.isArray(remote.items) ? remote.items.map(toProject) : []
      set({ projects, loading: false })
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : 'No se pudieron cargar los proyectos' })
    }
  },

  createProject: async (name, thumbnailUrl) => {
    const title = name?.trim() || UNTITLED
    const now = new Date().toISOString()
    const token = tokenOrNull()
    if (token) {
      const document = createBlankProjectFile(title, currentTheme())
      const remote = await projectsApi.createProject(token, {
        name: title,
        doc: createDrwyFile(document, title),
        thumbnail_url: thumbnailUrl ?? null,
      })
      const project = toProject(remote)
      set({ projects: [project, ...get().projects] })
      return project
    }

    const project: Project = {
      id: crypto.randomUUID(),
      source: 'guest',
      name: title,
      createdAt: now,
      updatedAt: now,
      thumbnailUrl: thumbnailUrl ?? null,
    }
    const projects = [project, ...get().projects.filter(p => p.source === 'guest')]
    persistGuestProjects(projects)
    try {
      localStorage.setItem(guestDocKey(project.id), JSON.stringify(createBlankProjectFile(title, currentTheme())))
    } catch {
      /* noop */
    }
    set({ projects })
    return project
  },

  deleteProject: async id => {
    const project = get().projects.find(p => p.id === id)
    if (!project) return
    const token = tokenOrNull()
    if (project.source === 'remote' && project.remoteId && token) {
      await projectsApi.deleteProject(token, project.remoteId)
    } else if (project.source === 'guest') {
      try {
        localStorage.removeItem(guestDocKey(project.id))
      } catch {
        /* noop */
      }
    }
    const projects = get().projects.filter(p => p.id !== id)
    persistGuestProjects(projects)
    set({ projects })
  },

  renameProject: async (id, name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const project = get().projects.find(p => p.id === id)
    if (!project) return
    const token = tokenOrNull()
    if (project.source === 'remote' && project.remoteId && token) {
      const remote = await projectsApi.renameProject(token, project.remoteId, trimmed, project.revision ?? 0)
      const updated = toProject(remote)
      const projects = get().projects.map(p => p.id === id ? updated : p)
      persistGuestProjects(projects)
      set({ projects, activeProject: get().activeProject?.id === id ? updated : get().activeProject })
      return
    }
    const updatedAt = new Date().toISOString()
    const projects = get().projects.map(p => p.id === id ? { ...p, name: trimmed, updatedAt } : p)
    persistGuestProjects(projects)
    set({ projects })
  },

  duplicateProject: async id => {
    const project = get().projects.find(p => p.id === id)
    if (!project) return null
    if (project.source === 'guest') {
      const now = new Date().toISOString()
      const copy: Project = {
        ...project,
        id: crypto.randomUUID(),
        name: `Copia de ${project.name}`,
        createdAt: now,
        updatedAt: now,
      }
      try {
        const raw = localStorage.getItem(guestDocKey(project.id))
        const source = raw ? JSON.parse(raw) as ProjectData : createBlankProjectFile(project.name)
        const cloned = JSON.parse(JSON.stringify(source)) as ProjectData
        if (cloned.doc) cloned.doc.name = copy.name
        localStorage.setItem(guestDocKey(copy.id), JSON.stringify(cloned))
      } catch {
        return null
      }
      const projects = [copy, ...get().projects]
      persistGuestProjects(projects)
      set({ projects })
      return copy
    }
    const token = tokenOrNull()
    if (!project.remoteId || !token) {
      set({ error: 'Debes iniciar sesion para duplicar en la nube' })
      return null
    }
    try {
      const remote = await projectsApi.duplicateProject(token, project.remoteId)
      const copy = toProject(remote)
      set({ projects: [copy, ...get().projects.filter(p => p.id !== copy.id)], error: null })
      return copy
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'No se pudo duplicar el tablero' })
      return null
    }
  },

  openProject: async id => {
    const project = get().projects.find(p => p.id === id)
    const token = tokenOrNull()
    const remoteId = project?.remoteId ?? (/^\d+$/.test(id) ? Number(id) : null)
    if ((project?.source === 'remote' || !project) && remoteId && token) {
      set({ loading: true, error: null, saveStatus: 'idle' })
      try {
        const remote = await projectsApi.getProject(token, remoteId)
        const projectData = remoteProjectData(remote)
        const opened = toProject(remote)
        set({
          activeProject: opened,
          activeProjectData: projectData,
          projects: get().projects.some(p => p.id === opened.id) ? get().projects.map(p => p.id === opened.id ? opened : p) : [opened, ...get().projects],
          loading: false,
          saveStatus: 'saved',
        })
        return projectData
      } catch (error) {
        set({ loading: false, error: error instanceof Error ? error.message : 'No se pudo abrir el proyecto', saveStatus: 'error' })
        return null
      }
    }

    if (project?.source === 'guest') {
      try {
        const raw = localStorage.getItem(guestDocKey(project.id))
        const data = raw ? JSON.parse(raw) as ProjectData : createBlankProjectFile(project.name)
        set({ activeProject: project, activeProjectData: data, saveStatus: 'idle' })
        return data
      } catch {
        const data = createBlankProjectFile(project.name)
        set({ activeProject: project, activeProjectData: data, saveStatus: 'idle' })
        return data
      }
    }

    set({ activeProject: null, activeProjectData: null, saveStatus: 'idle' })
    return null
  },

  saveActiveProject: async (document, name, thumbnailUrl) => {
    const project = get().activeProject
    if (!project) return 'idle'
    const title = name?.trim() || document.doc.name || project.name || UNTITLED
    if (project.source === 'guest') {
      const now = new Date().toISOString()
      try {
        localStorage.setItem(guestDocKey(project.id), JSON.stringify(document))
      } catch {
        /* noop */
      }
      const projects = get().projects.map(p => p.id === project.id ? { ...p, name: title, updatedAt: now, thumbnailUrl: thumbnailUrl ?? p.thumbnailUrl } : p)
      persistGuestProjects(projects)
      set({ projects, activeProject: { ...project, name: title, updatedAt: now, thumbnailUrl: thumbnailUrl ?? project.thumbnailUrl }, saveStatus: 'saved' })
      return 'saved'
    }

    const token = tokenOrNull()
    if (!project.remoteId || !token) {
      set({ saveStatus: 'error', error: 'Debes iniciar sesion para guardar en la nube' })
      return 'error'
    }

    set({ saveStatus: 'saving', error: null })
    try {
      const remote = await projectsApi.updateProject(token, project.remoteId, {
        name: title,
        doc: createDrwyFile(document, title),
        thumbnail_url: thumbnailUrl ?? project.thumbnailUrl ?? null,
        revision: project.revision,
      })
      const updated = toProject(remote)
      set({
        projects: get().projects.map(p => p.id === updated.id ? updated : p),
        activeProject: updated,
        saveStatus: 'saved',
        conflictDocument: null,
      })
      return 'saved'
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        set({ saveStatus: 'conflict', error: 'El proyecto remoto cambio desde otra sesion', conflictDocument: document })
        return 'conflict'
      }
      set({ saveStatus: 'error', error: error instanceof Error ? error.message : 'No se pudo guardar el proyecto' })
      return 'error'
    }
  },

  saveDocumentAsRemote: async (document, name, thumbnailUrl) => {
    const token = tokenOrNull()
    if (!token) {
      set({ saveStatus: 'error', error: 'Debes iniciar sesion para guardar en la nube' })
      return null
    }
    const title = name?.trim() || document.doc.name || UNTITLED
    set({ saveStatus: 'saving', error: null })
    try {
      const remote = await projectsApi.createProject(token, {
        name: title,
        doc: createDrwyFile(document, title),
        thumbnail_url: thumbnailUrl ?? null,
      })
      const project = toProject(remote)
      set({
        projects: [project, ...get().projects.filter(p => p.id !== project.id)],
        activeProject: project,
        activeProjectData: document,
        saveStatus: 'saved',
        conflictDocument: null,
      })
      return project
    } catch (error) {
      set({ saveStatus: 'error', error: error instanceof Error ? error.message : 'No se pudo crear el proyecto remoto' })
      return null
    }
  },

  reloadAfterConflict: async () => {
    const project = get().activeProject
    const token = tokenOrNull()
    if (!project?.remoteId || !token) return null
    try {
      const remote = await projectsApi.getProject(token, project.remoteId)
      const data = remoteProjectData(remote)
      const updated = toProject(remote)
      set({
        projects: get().projects.map(p => p.id === updated.id ? updated : p),
        activeProject: updated,
        activeProjectData: data,
        saveStatus: 'saved',
        conflictDocument: null,
        error: null,
      })
      return data
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'No se pudo recargar el tablero' })
      return null
    }
  },

  saveConflictAsCopy: async () => {
    const document = get().conflictDocument
    const project = get().activeProject
    if (!document) return null
    const copy = await get().saveDocumentAsRemote(document, `Copia de ${project?.name || document.doc.name}`)
    if (copy) set({ conflictDocument: null })
    return copy
  },

  markDirty: () => {
    const current = get().saveStatus
    if (current !== 'saving') set({ saveStatus: 'dirty' })
  },

  clearActiveProject: () => {
    set({ activeProject: null, activeProjectData: null, conflictDocument: null, saveStatus: 'idle' })
  },
}))
