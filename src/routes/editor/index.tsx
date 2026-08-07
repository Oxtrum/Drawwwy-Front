import { useCallback, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { CanvasStage } from '../../components/editor/canvas-stage'
import { EditorHeader } from '../../components/editor/header'
import { PagesBar } from '../../components/editor/pages-bar'
import { ToolRail } from '../../components/editor/tool-rail'
import { ShapesPanel } from '../../components/editor/shapes-panel'
import { MoreShapesPanel } from '../../components/ui/more-shapes-panel'
import { AnimationModal } from '../../components/editor/animation-modal'
import { renderCurrentPageThumbnail } from '../../canvas/export'
import { useAuthStore } from '../../lib/stores/auth-store'
import { useEditorStore } from '../../lib/stores/editor-store'
import { useProjectStore } from '../../lib/stores/project-store'
import { loadPersonalBoardState, savePersonalBoardState } from '../../lib/collaboration/personal-state'

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
  const lastPersistedSnapshotRef = useRef('')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveInFlightRef = useRef(false)
  const saveQueuedRef = useRef(false)
  const activeProjectRef = useRef(activeProject)
  const saveActiveProjectRef = useRef(saveActiveProject)
  const AUTOSAVE_DELAY_MS = 2500

  useEffect(() => {
    activeProjectRef.current = activeProject
  }, [activeProject])

  useEffect(() => {
    engine.readOnly = activeProject?.capabilities?.edit === false
    return () => { engine.readOnly = false }
  }, [activeProject?.capabilities?.edit, engine])

  useEffect(() => {
    saveActiveProjectRef.current = saveActiveProject
  }, [saveActiveProject])

  const clearSaveTimer = useCallback((): void => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = null
  }, [])

  const flushSave = useCallback(async (): Promise<void> => {
    if (!activeProjectRef.current) return
    if (saveInFlightRef.current) {
      saveQueuedRef.current = true
      return
    }
    engine.commitEdit()
    const snapshot = JSON.stringify(engine.serialize())
    if (snapshot === lastPersistedSnapshotRef.current) return

    // Serialize a stable snapshot. The canvas engine keeps mutable objects, so
    // passing its live document to an async request could otherwise save a
    // different state than the revision being acknowledged.
    const document = JSON.parse(snapshot) as ReturnType<typeof engine.serialize>
    saveInFlightRef.current = true
    const thumbnail = await renderCurrentPageThumbnail(engine).catch(() => null)
    const result = await saveActiveProjectRef.current(document, document.doc.name, thumbnail)
    saveInFlightRef.current = false

    if (result === 'saved') lastPersistedSnapshotRef.current = snapshot
    if (result !== 'saved') {
      saveQueuedRef.current = false
      return
    }
    if (saveQueuedRef.current || JSON.stringify(engine.serialize()) !== lastPersistedSnapshotRef.current) {
      saveQueuedRef.current = false
      void flushSave()
    }
  }, [engine])

  const scheduleSave = useCallback((delay = AUTOSAVE_DELAY_MS): void => {
    clearSaveTimer()
    saveTimerRef.current = setTimeout(() => { void flushSave() }, delay)
  }, [AUTOSAVE_DELAY_MS, clearSaveTimer, flushSave])

  useEffect(() => {
    let cancelled = false
    if (authStatus === 'unknown') return
    if (!id) {
      clearActiveProject()
      lastPersistedSnapshotRef.current = JSON.stringify(engine.serialize())
      return
    }
    applyingRef.current = true
    void openProject(id).then(data => {
      if (cancelled) return
      if (data) engine.applyProjectData(data)
      if (id) {
        const personal = loadPersonalBoardState(id)
        if (personal.currentPage !== undefined) engine.gotoPage(personal.currentPage)
        if (personal.grid !== undefined) engine.state.settings.grid = personal.grid
        if (personal.viewX !== undefined) engine.viewX = personal.viewX
        if (personal.viewY !== undefined) engine.viewY = personal.viewY
        if (personal.viewZoom !== undefined) engine.viewZoom = personal.viewZoom
      }
      lastPersistedSnapshotRef.current = JSON.stringify(engine.serialize())
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
    if (snapshot === lastPersistedSnapshotRef.current) return
    markDirty()
    scheduleSave()
  }, [activeProject, engine, markDirty, saveActiveProject, scheduleSave, version])

  useEffect(() => {
    if (!id || !activeProject) return
    savePersonalBoardState(id, {
      currentPage: engine.state.doc.cur,
      grid: engine.state.settings.grid,
      viewX: engine.viewX, viewY: engine.viewY, viewZoom: engine.viewZoom,
    })
  }, [activeProject, engine, id, version])

  useEffect(() => {
    return () => {
      clearSaveTimer()
      if (!activeProjectRef.current) return
      void flushSave()
    }
  }, [clearSaveTimer, engine, flushSave])

  return (
    <div className="editor-shell">
      <EditorHeader />
      <main>
        {activeProject?.capabilities?.edit === false && (
          <div className="read-only-notice" role="status">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>
            <span>Este tablero es de solo lectura</span>
          </div>
        )}
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
