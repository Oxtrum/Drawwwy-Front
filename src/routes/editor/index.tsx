import { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { CanvasStage } from '../../components/editor/canvas-stage'
import { EditorHeader } from '../../components/editor/header'
import { PagesBar } from '../../components/editor/pages-bar'
import { ToolRail } from '../../components/editor/tool-rail'
import { ShapesPanel } from '../../components/editor/shapes-panel'
import { MoreShapesPanel } from '../../components/ui/more-shapes-panel'
import { AnimationModal } from '../../components/editor/animation-modal'
import { useAuthStore } from '../../lib/stores/auth-store'
import { useEditorStore } from '../../lib/stores/editor-store'
import { useProjectStore } from '../../lib/stores/project-store'

export function EditorPage() {
  const { id } = useParams()
  const engine = useEditorStore(s => s.engine)
  const version = useEditorStore(s => s.version)
  const authStatus = useAuthStore(s => s.status)
  const openProject = useProjectStore(s => s.openProject)
  const saveActiveProject = useProjectStore(s => s.saveActiveProject)
  const markDirty = useProjectStore(s => s.markDirty)
  const clearActiveProject = useProjectStore(s => s.clearActiveProject)
  const activeProject = useProjectStore(s => s.activeProject)
  const applyingRef = useRef(false)
  const lastSnapshotRef = useRef('')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const AUTOSAVE_DELAY_MS = 2500

  useEffect(() => {
    let cancelled = false
    if (authStatus === 'unknown') return
    if (!id) {
      clearActiveProject()
      lastSnapshotRef.current = JSON.stringify(engine.serialize())
      return
    }
    applyingRef.current = true
    void openProject(id).then(data => {
      if (cancelled) return
      if (data) engine.applyProjectData(data)
      lastSnapshotRef.current = JSON.stringify(engine.serialize())
      applyingRef.current = false
    })
    return () => {
      cancelled = true
      applyingRef.current = false
    }
  }, [authStatus, clearActiveProject, engine, id, openProject])

  useEffect(() => {
    if (!activeProject || applyingRef.current) return
    const snapshot = JSON.stringify(engine.serialize())
    if (snapshot === lastSnapshotRef.current) return
    lastSnapshotRef.current = snapshot
    markDirty()
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      void saveActiveProject(engine.serialize(), engine.state.doc.name)
    }, AUTOSAVE_DELAY_MS)
  }, [activeProject, engine, markDirty, saveActiveProject, version])

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  return (
    <div className="editor-shell">
      <EditorHeader />
      <main>
        <ToolRail />
        <ShapesPanel />
        <CanvasStage />
        <MoreShapesPanel />
      </main>
      <PagesBar />
      <AnimationModal />
    </div>
  )
}
