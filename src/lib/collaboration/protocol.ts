import { clientId, newCollaborationId } from './identity'

export const COLLABORATION_PROTOCOL_VERSION = 1 as const

export type OperationKind =
  | 'document.rename' | 'document.theme' | 'page.create' | 'page.rename' | 'page.delete'
  | 'node.create' | 'node.patch' | 'node.delete'
  | 'edge.create' | 'edge.patch' | 'edge.delete'

export interface CollaborationOperation {
  protocolVersion: typeof COLLABORATION_PROTOCOL_VERSION
  id: string
  clientId: string
  clientSequence: number
  kind: OperationKind
  targetId: string
  payload: Record<string, unknown>
  createdAt: string
}

// The journal supplies client-side idempotency now; phase 5 will send exactly
// these envelopes to the collaboration gateway and use id as the dedupe key.
export class OperationJournal {
  private sequence = 0
  private seen = new Set<string>()

  create(kind: OperationKind, targetId: string, payload: Record<string, unknown>): CollaborationOperation {
    this.sequence++
    const operation: CollaborationOperation = {
      protocolVersion: COLLABORATION_PROTOCOL_VERSION,
      id: newCollaborationId(), clientId: clientId(), clientSequence: this.sequence,
      kind, targetId, payload, createdAt: new Date().toISOString(),
    }
    this.seen.add(operation.id)
    return operation
  }

  accept(operation: CollaborationOperation): boolean {
    if (operation.protocolVersion !== COLLABORATION_PROTOCOL_VERSION || this.seen.has(operation.id)) return false
    this.seen.add(operation.id)
    return true
  }
}
