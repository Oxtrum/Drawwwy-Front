import { create } from 'zustand'
import { CanvasEngine, type EditBox } from '../../canvas/engine'
import type { CollaboratorPresence } from '../collaboration/presence'
import type { CollaborationStatus } from '../collaboration/local-yjs'

interface EditorStore {
  engine: CanvasEngine
  version: number
  editBox: EditBox | null
  shapesPanelOpen: boolean
  toggleShapesPanel: (open?: boolean) => void
  moreShapesOpen: boolean
  toggleMoreShapes: (open?: boolean) => void
  animationModalOpen: boolean
  toggleAnimationModal: (open?: boolean) => void
  collaborators: CollaboratorPresence[]
  setCollaborators: (collaborators: CollaboratorPresence[]) => void
  collaborationStatus: CollaborationStatus | null
  setCollaborationStatus: (status: CollaborationStatus | null) => void
}

export const engine = new CanvasEngine()

export const useEditorStore = create<EditorStore>(set => ({
  engine,
  version: 0,
  editBox: null,
  shapesPanelOpen: false,
  toggleShapesPanel: open => set(s => ({ shapesPanelOpen: open ?? !s.shapesPanelOpen })),
  moreShapesOpen: false,
  toggleMoreShapes: open => set(s => ({ moreShapesOpen: open ?? !s.moreShapesOpen })),
  animationModalOpen: false,
  toggleAnimationModal: open => set(s => ({ animationModalOpen: open ?? !s.animationModalOpen })),
  collaborators: [],
  setCollaborators: collaborators => set({ collaborators }),
  collaborationStatus: null,
  setCollaborationStatus: collaborationStatus => set({ collaborationStatus }),
}))

engine.onChange = () => useEditorStore.setState(s => ({ version: s.version + 1 }))
engine.onEditBoxChange = box => useEditorStore.setState({ editBox: box ? { ...box } : null })
