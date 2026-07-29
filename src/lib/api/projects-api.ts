import type { DrwyFile } from '../drwy/format'
import { apiRequest } from './client'

export interface RemoteProject {
  id: number
  user_id: number
  name: string
  doc: unknown
  document_format?: string
  document_format_version?: number
  revision: number
  created_at: string
  updated_at: string
  thumbnail_url?: string | null
  deleted_at?: string | null
}

export interface ProjectWriteInput {
  name: string
  doc: DrwyFile
  thumbnail_url?: string | null
  revision?: number
}

export function listProjects(token: string): Promise<RemoteProject[]> {
  return apiRequest<RemoteProject[]>('/projects/', { token })
}

export function createProject(token: string, input: ProjectWriteInput): Promise<RemoteProject> {
  return apiRequest<RemoteProject>('/projects/', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  })
}

export function getProject(token: string, id: number): Promise<RemoteProject> {
  return apiRequest<RemoteProject>(`/projects/${id}`, { token })
}

export function updateProject(token: string, id: number, input: ProjectWriteInput): Promise<RemoteProject> {
  return apiRequest<RemoteProject>(`/projects/${id}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(input),
  })
}

export function renameProject(token: string, id: number, name: string): Promise<RemoteProject> {
  return apiRequest<RemoteProject>(`/projects/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ name }),
  })
}

export function deleteProject(token: string, id: number): Promise<void> {
  return apiRequest<void>(`/projects/${id}`, {
    method: 'DELETE',
    token,
  })
}
