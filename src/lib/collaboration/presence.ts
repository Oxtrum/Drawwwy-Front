import type { Point } from '../../canvas/types'

export const COLLABORATOR_COLORS = ['#2563EB', '#DB2777', '#059669', '#D97706', '#7C3AED', '#0891B2'] as const

export interface ActiveCollaborationTarget {
  pageId: string
  type: 'node' | 'edge'
  id: string
}

export interface CollaboratorPresence {
  clientId: number
  name: string
  color: string
  isSelf: boolean
  cursor?: Point & { pageId: string }
  activeTarget?: ActiveCollaborationTarget
}

export function collaboratorColor(clientId: number): string {
  return COLLABORATOR_COLORS[Math.abs(clientId) % COLLABORATOR_COLORS.length]
}
