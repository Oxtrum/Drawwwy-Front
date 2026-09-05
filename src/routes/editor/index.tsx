import { useCallback, useEffect, useRef, useState } from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router-dom'
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
import { projectEditorPath, useProjectStore } from '../../lib/stores/project-store'
import { loadPersonalBoardState, savePersonalBoardState } from '../../lib/collaboration/personal-state'
import { deleteProjectDraft, saveProjectDraft } from '../../lib/persistence/project-drafts'
import type { SyncSource } from '../../lib/api/projects-api'
import type { Project } from '../../lib/stores/project-store'
import type { ProjectFile } from '../../canvas/state'

interface PendingDraft {
  project: Project
  document: ProjectFile
  snapshot: string
}

type ExitIntent = 'navigation' | 'logout'

interface ExitConfirmationProps {
  busy: boolean
  error: string | null
  onCancel: () => void
  onLeaveWithoutSync: () => void
  onSyncAndLeave: () => void
}

function ExitConfirmation({ busy, error, onCancel, onLeaveWithoutSync, onSyncAndLeave }: ExitConfirmationProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card exit-confirmation" role="dialog" aria-modal="true" aria-labelledby="exit-title" aria-describedby="exit-description">
        <div className="modal-head">
          <h3 id="exit-title">Cambios pendientes</h3>
        </div>
        <p id="exit-description">El borrador está guardado en este dispositivo, pero todavía no está sincronizado con la nube.</p>
        {error && <p className="exit-confirmation-error" role="alert">{error}</p>}
        <div className="exit-confirmation-actions">
          <button disabled={busy} onClick={onCancel}>Cancelar</button>
          <button disabled={busy} onClick={onLeaveWithoutSync}>Salir sin sincronizar</button>
          <button className="primary" autoFocus disabled={busy} onClick={onSyncAndLeave}>
            {busy ? 'Sincronizando…' : 'Sincronizar y salir'}
          </button>
        </div>
      </div>
    </div>
  )
}

function positiveDuration(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const DRAFT_SAVE_DELAY_MS = 500
const REMOTE_IDLE_DELAY_MS = positiveDuration(import.meta.env.VITE_REMOTE_SYNC_IDLE_MS, 120_000)
const REMOTE_MIN_INTERVAL_MS = positiveDuration(import.meta.env.VITE_REMOTE_SYNC_MIN_INTERVAL_MS, 600_000)

function contentDocument(engine: ReturnType<typeof useEditorStore.getState>['engine']): ProjectFile {
  const document = JSON.parse(JSON.stringify(engine.serialize())) as ProjectFile
  // These values describe this browser session, not the shared board.
  document.doc.cur = 0
  document.settings.grid = true
  document.settings.edgeRoute = 'straight'
  return document
}

function snapshotOf(document: ProjectFile): string {
  return JSON.stringify(document)
}

function differsOnlyByName(current: string, persisted: string): boolean {
  if (!persisted) return false
  try {
    const a = JSON.parse(current) as ProjectFile
    const b = JSON.parse(persisted) as ProjectFile
    a.doc.name = ''
    b.doc.name = ''
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

export function EditorPage() {
  const { id, publicID, localRef } = useParams()
  const navigate = useNavigate()
  const engine = useEditorStore(s => s.engine)
  const version = useEditorStore(s => s.version)
  const documentVersion = useEditorStore(s => s.documentVersion)
  const setSyncHandler = useEditorStore(s => s.setSyncHandler)
  const setLogoutHandler = useEditorStore(s => s.setLogoutHandler)
  const authStatus = useAuthStore(s => s.status)
  const logout = useAuthStore(s => s.logout)
  const openProject = useProjectStore(s => s.openProject)
  const saveActiveProject = useProjectStore(s => s.saveActiveProject)
  const markDirty = useProjectStore(s => s.markDirty)
  const markDraftSaved = useProjectStore(s => s.markDraftSaved)
  const markClean = useProjectStore(s => s.markClean)
  const clearActiveProject = useProjectStore(s => s.clearActiveProject)
  const activeProject = useProjectStore(s => s.activeProject)
  const saveStatus = useProjectStore(s => s.saveStatus)
  const [exitIntent, setExitIntent] = useState<ExitIntent | null>(null)
  const [exitBusy, setExitBusy] = useState(false)
  const [exitError, setExitError] = useState<string | null>(null)
  const allowNavigationRef = useRef(false)
  const hasUnsyncedRemote = activeProject?.source === 'remote'
    && activeProject.capabilities?.edit !== false
    && ['dirty', 'draft', 'saving', 'error', 'conflict'].includes(saveStatus)
  const blocker = useBlocker(useCallback(({ currentLocation, nextLocation }) => (
    !allowNavigationRef.current
    && hasUnsyncedRemote
    && `${currentLocation.pathname}${currentLocation.search}${currentLocation.hash}`
      !== `${nextLocation.pathname}${nextLocation.search}${nextLocation.hash}`
  ), [hasUnsyncedRemote]))

  const applyingRef = useRef(false)
  const lastCloudSnapshotRef = useRef('')
  const latestSnapshotRef = useRef('')
  const lastDraftSnapshotRef = useRef('')
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingDraftRef = useRef<PendingDraft | null>(null)
  const draftWriteInFlightRef = useRef<Promise<void> | null>(null)
  const syncInFlightRef = useRef<Promise<void> | null>(null)
  const manualSyncQueuedProjectRef = useRef<string | null>(null)
  const activeProjectRef = useRef(activeProject)
  const saveActiveProjectRef = useRef(saveActiveProject)
  const syncNowRef = useRef<(source: SyncSource) => Promise<void>>(async () => undefined)
  const scheduleIdleSyncRef = useRef<() => void>(() => undefined)
  const lastRemoteSyncByProjectRef = useRef(new Map<string, number>())

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

  const clearDraftTimer = useCallback((): void => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = null
  }, [])

  const clearIdleTimer = useCallback((): void => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = null
  }, [])

  const flushDraft = useCallback(async (): Promise<void> => {
    const pending = pendingDraftRef.current
    if (!pending) return
    pendingDraftRef.current = null
    const previousWrite = draftWriteInFlightRef.current
    const write = (async () => {
      await previousWrite?.catch(() => undefined)
      if (pending.project.source === 'guest' && activeProjectRef.current?.id === pending.project.id) {
        const result = await saveActiveProjectRef.current(pending.document, pending.document.doc.name)
        if (result === 'saved' && activeProjectRef.current?.id === pending.project.id) {
          lastCloudSnapshotRef.current = pending.snapshot
          if (snapshotOf(contentDocument(engine)) === pending.snapshot) markClean()
        }
      } else {
        await saveProjectDraft(pending.project, pending.document, {
          baseRevision: pending.project.revision ?? null,
          pending: true,
        })
        if (activeProjectRef.current?.id === pending.project.id
          && snapshotOf(contentDocument(engine)) === pending.snapshot) markDraftSaved()
      }
      if (activeProjectRef.current?.id === pending.project.id) {
        lastDraftSnapshotRef.current = pending.snapshot
      }
    })()
    draftWriteInFlightRef.current = write
    try {
      await write
    } catch {
      if (!pendingDraftRef.current && latestSnapshotRef.current === pending.snapshot) {
        pendingDraftRef.current = pending
      }
    } finally {
      if (draftWriteInFlightRef.current === write) draftWriteInFlightRef.current = null
    }
  }, [engine, markClean, markDraftSaved])

  const scheduleDraft = useCallback((project: Project, document: ProjectFile, snapshot: string): void => {
    pendingDraftRef.current = { project, document, snapshot }
    clearDraftTimer()
    draftTimerRef.current = setTimeout(() => { void flushDraft() }, DRAFT_SAVE_DELAY_MS)
  }, [clearDraftTimer, flushDraft])

  const scheduleIdleSync = useCallback((): void => {
    clearIdleTimer()
    const project = activeProjectRef.current
    if (!project || project.source !== 'remote' || project.capabilities?.edit === false) return
    const lastSync = lastRemoteSyncByProjectRef.current.get(project.id) ?? 0
    const dueAt = Math.max(Date.now() + REMOTE_IDLE_DELAY_MS, lastSync + REMOTE_MIN_INTERVAL_MS)
    idleTimerRef.current = setTimeout(() => { void syncNowRef.current('idle') }, Math.max(0, dueAt - Date.now()))
  }, [clearIdleTimer])

  scheduleIdleSyncRef.current = scheduleIdleSync

  const performSync = useCallback(async (source: SyncSource): Promise<void> => {
    const project = activeProjectRef.current
    if (!project || project.source !== 'remote' || project.capabilities?.edit === false) return

    if (source === 'idle') {
      const lastSync = lastRemoteSyncByProjectRef.current.get(project.id) ?? 0
      if (Date.now() - lastSync < REMOTE_MIN_INTERVAL_MS) {
        scheduleIdleSyncRef.current()
        return
      }
    }

    engine.commitEdit()
    const document = contentDocument(engine)
    const snapshot = snapshotOf(document)
    latestSnapshotRef.current = snapshot
    if (snapshot === lastCloudSnapshotRef.current) {
      await deleteProjectDraft(project).catch(() => undefined)
      markClean()
      return
    }

    if (snapshot !== lastDraftSnapshotRef.current) scheduleDraft(project, document, snapshot)
    clearDraftTimer()
    await flushDraft()
    if (pendingDraftRef.current?.snapshot === snapshot) {
      useProjectStore.setState({
        saveStatus: 'error',
        error: 'No se pudo guardar el borrador local. La sincronización fue cancelada.',
      })
      return
    }

    const thumbnail = differsOnlyByName(snapshot, lastCloudSnapshotRef.current)
      ? project.thumbnailUrl ?? null
      : await renderCurrentPageThumbnail(engine).catch(() => null)
    const result = await saveActiveProjectRef.current(document, document.doc.name, thumbnail, source)
    if (result !== 'saved') return

    const currentProject = useProjectStore.getState().activeProject
    if (!currentProject || currentProject.id !== project.id) return
    lastCloudSnapshotRef.current = snapshot
    lastRemoteSyncByProjectRef.current.set(project.id, Date.now())

    const currentDocument = contentDocument(engine)
    const currentSnapshot = snapshotOf(currentDocument)
    latestSnapshotRef.current = currentSnapshot
    if (currentSnapshot === snapshot) {
      pendingDraftRef.current = null
      lastDraftSnapshotRef.current = snapshot
      await deleteProjectDraft(currentProject).catch(() => undefined)
      markClean()
      return
    }

    await saveProjectDraft(currentProject, currentDocument, {
      baseRevision: currentProject.revision ?? null,
      pending: true,
    }).catch(() => undefined)
    lastDraftSnapshotRef.current = currentSnapshot
    if (snapshotOf(contentDocument(engine)) === currentSnapshot) markDraftSaved()
    scheduleIdleSyncRef.current()
  }, [clearDraftTimer, engine, flushDraft, markClean, markDraftSaved, scheduleDraft])

  const syncNow = useCallback(async (source: SyncSource): Promise<void> => {
    const project = activeProjectRef.current
    if (project?.source === 'guest' && project.capabilities?.edit !== false) {
      engine.commitEdit()
      const document = contentDocument(engine)
      const snapshot = snapshotOf(document)
      latestSnapshotRef.current = snapshot
      if (snapshot !== lastDraftSnapshotRef.current) scheduleDraft(project, document, snapshot)
      clearDraftTimer()
      await flushDraft()
      return
    }
    if (syncInFlightRef.current) {
      if (source === 'manual') manualSyncQueuedProjectRef.current = activeProjectRef.current?.id ?? null
      await syncInFlightRef.current
      return
    }

    const task = performSync(source)
    syncInFlightRef.current = task
    try {
      await task
    } finally {
      if (syncInFlightRef.current === task) syncInFlightRef.current = null
      const queuedProject = manualSyncQueuedProjectRef.current
      manualSyncQueuedProjectRef.current = null
      if (queuedProject && activeProjectRef.current?.id === queuedProject) {
        void syncNowRef.current('manual')
      } else if (latestSnapshotRef.current !== lastCloudSnapshotRef.current) {
        scheduleIdleSyncRef.current()
      }
    }
  }, [clearDraftTimer, engine, flushDraft, performSync, scheduleDraft])

  syncNowRef.current = syncNow

  useEffect(() => {
    setSyncHandler(syncNow)
    return () => setSyncHandler(null)
  }, [setSyncHandler, syncNow])

  const persistLatestDraft = useCallback(async (): Promise<boolean> => {
    const project = activeProjectRef.current
    if (!project || project.capabilities?.edit === false) return true
    engine.commitEdit()
    const document = contentDocument(engine)
    const snapshot = snapshotOf(document)
    latestSnapshotRef.current = snapshot
    if (snapshot !== lastDraftSnapshotRef.current) scheduleDraft(project, document, snapshot)
    clearDraftTimer()
    await flushDraft()
    await draftWriteInFlightRef.current?.catch(() => undefined)
    return pendingDraftRef.current === null
  }, [clearDraftTimer, engine, flushDraft, scheduleDraft])

  const finishExit = useCallback((intent: ExitIntent): void => {
    allowNavigationRef.current = true
    setExitIntent(null)
    setExitError(null)
    if (intent === 'logout') {
      logout()
      navigate('/')
    } else if (blocker.state === 'blocked') {
      blocker.proceed()
    }
    setTimeout(() => { allowNavigationRef.current = false }, 0)
  }, [blocker, logout, navigate])

  const cancelExit = useCallback((): void => {
    if (blocker.state === 'blocked') blocker.reset()
    setExitIntent(null)
    setExitError(null)
  }, [blocker])

  const leaveWithoutSync = useCallback(async (): Promise<void> => {
    if (!exitIntent) return
    setExitBusy(true)
    setExitError(null)
    const persisted = await persistLatestDraft()
    setExitBusy(false)
    if (!persisted) {
      setExitError('No se pudo confirmar el borrador local. La salida fue cancelada para evitar perder cambios.')
      return
    }
    finishExit(exitIntent)
  }, [exitIntent, finishExit, persistLatestDraft])

  const syncAndLeave = useCallback(async (): Promise<void> => {
    if (!exitIntent) return
    setExitBusy(true)
    setExitError(null)
    await syncNowRef.current('navigation')
    const status = useProjectStore.getState().saveStatus
    setExitBusy(false)
    if (status === 'saved') {
      finishExit(exitIntent)
      return
    }
    setExitError(status === 'conflict'
      ? 'La nube contiene una revisión distinta. Resuelve el conflicto antes de salir o conserva este borrador sin sincronizar.'
      : 'No se pudo sincronizar. El borrador local se conserva y puedes volver a intentarlo.')
  }, [exitIntent, finishExit])

  const requestLogout = useCallback((): void => {
    if (hasUnsyncedRemote) {
      setExitError(null)
      setExitIntent('logout')
      return
    }
    allowNavigationRef.current = true
    logout()
    navigate('/')
    setTimeout(() => { allowNavigationRef.current = false }, 0)
  }, [hasUnsyncedRemote, logout, navigate])

  useEffect(() => {
    setLogoutHandler(requestLogout)
    return () => setLogoutHandler(null)
  }, [requestLogout, setLogoutHandler])

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setExitError(null)
      setExitIntent('navigation')
    }
  }, [blocker.state])

  useEffect(() => {
    if (!exitIntent || exitBusy) return
    const onEscape = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      cancelExit()
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [cancelExit, exitBusy, exitIntent])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return
      event.preventDefault()
      void syncNowRef.current('manual')
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!hasUnsyncedRemote) return
    const onBeforeUnload = (event: BeforeUnloadEvent): void => {
      if (allowNavigationRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [hasUnsyncedRemote])

  useEffect(() => {
    let cancelled = false
    if (authStatus === 'unknown') return
    clearDraftTimer()
    clearIdleTimer()
    void flushDraft()
    activeProjectRef.current = null
    lastCloudSnapshotRef.current = ''
    if (!id && !publicID && !localRef) {
      clearActiveProject()
      const document = contentDocument(engine)
      const snapshot = snapshotOf(document)
      lastCloudSnapshotRef.current = snapshot
      latestSnapshotRef.current = snapshot
      lastDraftSnapshotRef.current = snapshot
      return
    }
    clearActiveProject()
    applyingRef.current = true
    void openProject(id, publicID, localRef).then(data => {
      if (cancelled) return
      const store = useProjectStore.getState()
      const cloudData = store.activeCloudData
      if (data && cloudData && data !== cloudData) {
        engine.applyProjectData(cloudData)
        lastCloudSnapshotRef.current = snapshotOf(contentDocument(engine))
        engine.applyProjectData(data)
      } else if (data) {
        engine.applyProjectData(data)
        lastCloudSnapshotRef.current = snapshotOf(contentDocument(engine))
      }
      const projectReference = localRef ?? publicID ?? id
      if (projectReference) {
        const personal = loadPersonalBoardState(projectReference)
        engine.gotoPage(personal.currentPage ?? 0)
        engine.state.settings.grid = personal.grid ?? true
        engine.state.settings.edgeRoute = personal.edgeRoute ?? 'straight'
        if (personal.viewX !== undefined) engine.viewX = personal.viewX
        if (personal.viewY !== undefined) engine.viewY = personal.viewY
        if (personal.viewZoom !== undefined) engine.viewZoom = personal.viewZoom
      }
      const snapshot = snapshotOf(contentDocument(engine))
      latestSnapshotRef.current = snapshot
      lastDraftSnapshotRef.current = snapshot
      applyingRef.current = false
      const opened = useProjectStore.getState().activeProject
      activeProjectRef.current = opened
      if (snapshot !== lastCloudSnapshotRef.current && opened?.source === 'remote') {
        markDirty()
        scheduleIdleSyncRef.current()
      }
      if (data && !publicID && opened?.source === 'remote' && opened.publicId) {
        allowNavigationRef.current = true
        navigate(projectEditorPath(opened), { replace: true })
        setTimeout(() => { allowNavigationRef.current = false }, 0)
      }
      if (data && !localRef && opened?.source === 'guest' && opened.localRef) {
        allowNavigationRef.current = true
        navigate(projectEditorPath(opened), { replace: true })
        setTimeout(() => { allowNavigationRef.current = false }, 0)
      }
    })
    return () => {
      cancelled = true
      applyingRef.current = false
    }
  }, [authStatus, clearActiveProject, clearDraftTimer, clearIdleTimer, engine, flushDraft, id, localRef, markDirty, navigate, openProject, publicID])

  useEffect(() => {
    if (!activeProject || applyingRef.current || activeProject.capabilities?.edit === false) return
    const document = contentDocument(engine)
    const snapshot = snapshotOf(document)
    if (snapshot === latestSnapshotRef.current) return
    latestSnapshotRef.current = snapshot
    if (snapshot === lastCloudSnapshotRef.current) {
      clearDraftTimer()
      pendingDraftRef.current = null
      void deleteProjectDraft(activeProject).catch(() => undefined)
      markClean()
      return
    }
    if (snapshot !== lastDraftSnapshotRef.current) scheduleDraft(activeProject, document, snapshot)
    markDirty()
    if (activeProject.source === 'remote') scheduleIdleSync()
  }, [activeProject, clearDraftTimer, documentVersion, engine, markClean, markDirty, scheduleDraft, scheduleIdleSync])

  useEffect(() => {
    const projectReference = localRef ?? publicID ?? id
    if (!projectReference || !activeProject) return
    savePersonalBoardState(projectReference, {
      currentPage: engine.state.doc.cur,
      grid: engine.state.settings.grid,
      edgeRoute: engine.state.settings.edgeRoute,
      viewX: engine.viewX,
      viewY: engine.viewY,
      viewZoom: engine.viewZoom,
    })
  }, [activeProject, engine, id, localRef, publicID, version])

  useEffect(() => {
    return () => {
      clearIdleTimer()
      clearDraftTimer()
      void flushDraft()
    }
  }, [clearDraftTimer, clearIdleTimer, flushDraft])

  return (
    <>
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
      {exitIntent && (
        <ExitConfirmation
          busy={exitBusy}
          error={exitError}
          onCancel={cancelExit}
          onLeaveWithoutSync={() => void leaveWithoutSync()}
          onSyncAndLeave={() => void syncAndLeave()}
        />
      )}
    </>
  )
}
