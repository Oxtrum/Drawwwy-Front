export interface PersonalBoardState {
  currentPage?: number
  grid?: boolean
  viewX?: number
  viewY?: number
  viewZoom?: number
}

function key(projectId: string): string { return `drawwwy.collaboration.personal.${projectId}` }

export function loadPersonalBoardState(projectId: string): PersonalBoardState {
  try { return JSON.parse(localStorage.getItem(key(projectId)) || '{}') as PersonalBoardState } catch { return {} }
}

export function savePersonalBoardState(projectId: string, state: PersonalBoardState): void {
  try { localStorage.setItem(key(projectId), JSON.stringify(state)) } catch { /* best effort */ }
}
