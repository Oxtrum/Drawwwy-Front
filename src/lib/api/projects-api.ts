import type { DrwyFile } from '../drwy/format'
import { apiRequest } from './client'

export interface RemoteProject {
  id: number
  public_id?: string | null
  user_id: number
  name: string
  doc?: unknown
  document_format?: string
  document_format_version?: number
  revision: number
  created_at: string
  updated_at: string
  thumbnail_url?: string | null
  deleted_at?: string | null
  owner: {
    id: number
    name: string
    avatar_url?: string | null
  }
  access: 'owner' | 'editor' | 'viewer'
  capabilities: {
    read: boolean
    edit: boolean
    manage_sharing: boolean
    delete: boolean
    duplicate: boolean
  }
}

export interface RemoteProjectList {
  items: RemoteProject[]
  next_offset?: number
}

export interface ProjectMember {
  user: RemoteProject['owner']
  role: 'owner' | 'editor' | 'viewer'
  created_at: string
}

export interface ProjectWriteInput {
  name: string
  doc: DrwyFile
  thumbnail_url?: string | null
  revision?: number
}

export type SyncSource = 'manual' | 'idle' | 'navigation'

export function listProjects(token: string): Promise<RemoteProjectList> {
  return apiRequest<RemoteProjectList>('/projects/', { token })
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

export function getProjectByPublicID(token: string, publicID: string): Promise<RemoteProject> {
  return apiRequest<RemoteProject>(`/projects/ref/${encodeURIComponent(publicID)}`, { token })
}

function projectPath(id: number, publicID?: string | null): string {
  return publicID ? `/projects/ref/${encodeURIComponent(publicID)}` : `/projects/${id}`
}

export function updateProject(
  token: string,
  id: number,
  input: ProjectWriteInput,
  publicID?: string | null,
  syncSource: SyncSource = 'manual',
): Promise<RemoteProject> {
  return apiRequest<RemoteProject>(projectPath(id, publicID), {
    method: 'PUT',
    token,
    headers: { 'X-Sync-Source': syncSource },
    body: JSON.stringify(input),
  })
}

export function renameProject(token: string, id: number, name: string, revision: number, publicID?: string | null): Promise<RemoteProject> {
  return apiRequest<RemoteProject>(projectPath(id, publicID), {
    method: 'PATCH',
    token,
    body: JSON.stringify({ name, revision }),
  })
}

export function duplicateProject(token: string, id: number, name?: string, publicID?: string | null): Promise<RemoteProject> {
  return apiRequest<RemoteProject>(`${projectPath(id, publicID)}/duplicate`, {
    method: 'POST',
    token,
    body: JSON.stringify(name?.trim() ? { name: name.trim() } : {}),
  })
}

export function listMembers(token: string, id: number, publicID?: string | null): Promise<ProjectMember[]> {
  return apiRequest<ProjectMember[]>(`${projectPath(id, publicID)}/members`, { token })
}

export function addMember(token: string, id: number, input: { email: string; role: 'editor' | 'viewer' }, publicID?: string | null): Promise<void> {
  return apiRequest<void>(`${projectPath(id, publicID)}/members`, { method: 'POST', token, body: JSON.stringify(input) })
}

export function updateMember(token: string, id: number, userId: number, role: 'editor' | 'viewer', publicID?: string | null): Promise<void> {
  return apiRequest<void>(`${projectPath(id, publicID)}/members/${userId}`, { method: 'PATCH', token, body: JSON.stringify({ role }) })
}

export function removeMember(token: string, id: number, userId: number, publicID?: string | null): Promise<void> {
  return apiRequest<void>(`${projectPath(id, publicID)}/members/${userId}`, { method: 'DELETE', token })
}

export function deleteProject(token: string, id: number, publicID?: string | null): Promise<void> {
  return apiRequest<void>(projectPath(id, publicID), {
    method: 'DELETE',
    token,
  })
}
