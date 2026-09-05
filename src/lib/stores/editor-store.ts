import { create } from 'zustand'
import { CanvasEngine, type EditBox } from '../../canvas/engine'
import type { SyncSource } from '../api/projects-api'

interface EditorStore {
  engine: CanvasEngine
  version: number
  documentVersion: number
  editBox: EditBox | null
  shapesPanelOpen: boolean
  toggleShapesPanel: (open?: boolean) => void
  moreShapesOpen: boolean
  toggleMoreShapes: (open?: boolean) => void
  animationModalOpen: boolean
  toggleAnimationModal: (open?: boolean) => void
  syncActiveProject: (source?: SyncSource) => Promise<void>
  setSyncHandler: (handler: ((source: SyncSource) => Promise<void>) | null) => void
  logoutHandler: (() => void) | null
  requestLogout: () => boolean
  setLogoutHandler: (handler: (() => void) | null) => void
}

export const engine = new CanvasEngine()

export const useEditorStore = create<EditorStore>((set, get) => ({
  engine,
  version: 0,
  documentVersion: 0,
  editBox: null,
  shapesPanelOpen: false,
  toggleShapesPanel: open => set(s => ({ shapesPanelOpen: open ?? !s.shapesPanelOpen })),
  moreShapesOpen: false,
  toggleMoreShapes: open => set(s => ({ moreShapesOpen: open ?? !s.moreShapesOpen })),
  animationModalOpen: false,
  toggleAnimationModal: open => set(s => ({ animationModalOpen: open ?? !s.animationModalOpen })),
  syncActiveProject: async () => undefined,
  setSyncHandler: handler => set({
    syncActiveProject: handler
      ? (source = 'manual') => handler(source)
      : async () => undefined,
  }),
  logoutHandler: null,
  requestLogout: () => {
    const handler = get().logoutHandler
    if (!handler) return false
    handler()
    return true
  },
  setLogoutHandler: handler => set({ logoutHandler: handler }),
}))

engine.onChange = () => useEditorStore.setState(s => ({ version: s.version + 1 }))
engine.state.onContentChange = () => useEditorStore.setState(s => ({ documentVersion: s.documentVersion + 1 }))
engine.onEditBoxChange = box => useEditorStore.setState({ editBox: box ? { ...box } : null })
