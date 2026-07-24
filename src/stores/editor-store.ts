import { create } from 'zustand'
import { CanvasEngine, type EditBox } from '../canvas/engine'

interface EditorStore {
  engine: CanvasEngine
  version: number
  editBox: EditBox | null
  iconDrawerOpen: boolean
  toggleIconDrawer: (open?: boolean) => void
}

const engine = new CanvasEngine()

export const useEditorStore = create<EditorStore>(set => ({
  engine,
  version: 0,
  editBox: null,
  iconDrawerOpen: false,
  toggleIconDrawer: open => set(s => ({ iconDrawerOpen: open ?? !s.iconDrawerOpen })),
}))

engine.onChange = () => useEditorStore.setState(s => ({ version: s.version + 1 }))
engine.onEditBoxChange = box => useEditorStore.setState({ editBox: box ? { ...box } : null })
