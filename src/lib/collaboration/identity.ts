const CLIENT_ID_KEY = 'drawwwy.collaboration.client-id.v1'

function randomId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export function clientId(): string {
  try {
    const stored = localStorage.getItem(CLIENT_ID_KEY)
    if (stored) return stored
    const created = randomId()
    localStorage.setItem(CLIENT_ID_KEY, created)
    return created
  } catch {
    return randomId()
  }
}

export function newCollaborationId(): string { return randomId() }

// Deterministic IDs let legacy documents converge before their first save.
export function legacyCollaborationId(kind: string, pageIndex: number, localId: number): string {
  return `legacy:${kind}:${pageIndex}:${localId}`
}
