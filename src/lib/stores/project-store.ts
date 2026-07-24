import { create } from 'zustand'

export interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

const KEY = 'drawwwy.projects'
const UNTITLED = 'Sin título'

function isoMinutesAgo(min: number): string {
  return new Date(Date.now() - min * 60_000).toISOString()
}

/** Semilla usada solo la primera vez que se abre la app (localStorage vacío de verdad, sin la clave). */
function mockProjects(): Project[] {
  return [
    { id: crypto.randomUUID(), name: 'Arquitectura de Microservicios', createdAt: isoMinutesAgo(60 * 24 * 6), updatedAt: isoMinutesAgo(35) },
    { id: crypto.randomUUID(), name: 'Pipeline de Datos', createdAt: isoMinutesAgo(60 * 24 * 12), updatedAt: isoMinutesAgo(60 * 5) },
    { id: crypto.randomUUID(), name: 'Infraestructura AWS', createdAt: isoMinutesAgo(60 * 24 * 20), updatedAt: isoMinutesAgo(60 * 24 * 2) },
    { id: crypto.randomUUID(), name: 'Flujo de Autenticación', createdAt: isoMinutesAgo(60 * 24 * 30), updatedAt: isoMinutesAgo(60 * 24 * 9) },
    { id: crypto.randomUUID(), name: 'Diagrama de Red', createdAt: isoMinutesAgo(60 * 24 * 45), updatedAt: isoMinutesAgo(60 * 24 * 21) },
  ]
}

function load(): Project[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === null) {
      const seeded = mockProjects()
      localStorage.setItem(KEY, JSON.stringify(seeded))
      return seeded
    }
    return JSON.parse(raw) as Project[]
  } catch {
    return []
  }
}

function persist(projects: Project[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(projects))
  } catch {
    /* noop */
  }
}

interface ProjectStore {
  projects: Project[]
  loading: boolean
  createProject: (name?: string) => Project
  deleteProject: (id: string) => void
  renameProject: (id: string, name: string) => void
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: load(),
  loading: false,

  createProject: name => {
    const now = new Date().toISOString()
    const project: Project = {
      id: crypto.randomUUID(),
      name: name?.trim() || UNTITLED,
      createdAt: now,
      updatedAt: now,
    }
    const projects = [project, ...get().projects]
    persist(projects)
    set({ projects })
    return project
  },

  deleteProject: id => {
    const projects = get().projects.filter(p => p.id !== id)
    persist(projects)
    set({ projects })
  },

  renameProject: (id, name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const projects = get().projects.map(p =>
      p.id === id ? { ...p, name: trimmed, updatedAt: new Date().toISOString() } : p,
    )
    persist(projects)
    set({ projects })
  },
}))
