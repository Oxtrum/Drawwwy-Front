import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { exportCurrentPageAsJpg, exportDocumentAsPdf, renderCurrentPageThumbnail } from '../../canvas/export'
import { createDrwyFile, downloadBlob, DRWY_MIME, parseDrwyText, sanitizeFilename } from '../../lib/drwy/format'
import { useAuthStore } from '../../lib/stores/auth-store'
import { useEditorStore } from '../../lib/stores/editor-store'
import { useProjectStore } from '../../lib/stores/project-store'
import { Logo } from '../ui/logo'
import { ThemeToggle } from '../ui/theme-toggle'

export function EditorHeader() {
  const navigate = useNavigate()
  const engine = useEditorStore(s => s.engine)
  useEditorStore(s => s.version)
  const toggleAnimationModal = useEditorStore(s => s.toggleAnimationModal)
  const authStatus = useAuthStore(s => s.status)
  const saveStatus = useProjectStore(s => s.saveStatus)
  const activeProject = useProjectStore(s => s.activeProject)
  const saveActiveProject = useProjectStore(s => s.saveActiveProject)
  const saveDocumentAsRemote = useProjectStore(s => s.saveDocumentAsRemote)
  const settings = engine.state.settings
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(engine.state.doc.name)
  const inputRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setDraft(engine.state.doc.name)
  }, [editing, engine.state.doc.name])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const commit = (): void => {
    const value = draft.trim()
    if (value && value !== engine.state.doc.name) {
      engine.state.setProjectName(value)
      engine.notify()
    } else {
      setDraft(engine.state.doc.name)
    }
    setEditing(false)
  }

  const cancelRename = (): void => {
    setDraft(engine.state.doc.name)
    setEditing(false)
  }

  const handleExportDrwy = (): void => {
    const title = engine.state.doc.name || 'Diagrama'
    const file = createDrwyFile(engine.serialize(), title)
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: DRWY_MIME })
    downloadBlob(blob, `${sanitizeFilename(file.title || 'diagrama')}.drwy`)
  }

  const handleImport = async (file: File): Promise<void> => {
    try {
      const hasContent = engine.state.currentPage().nodes.length > 0 || engine.state.currentPage().edges.length > 0 || engine.state.doc.pages.length > 1
      if (hasContent && !window.confirm('La importacion reemplazara el diagrama actual. Continuar?')) return
      const parsed = parseDrwyText(await file.text())
      engine.applyProjectData(parsed.projectData)
      if (parsed.title) {
        engine.state.setProjectName(parsed.title)
        engine.notify()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message.replace(/^DRWY_INVALID:\s*/, '') : 'No se pudo importar el archivo.'
      window.alert(`No se pudo importar el archivo: ${message}`)
    }
  }

  const handleExportJpg = async (): Promise<void> => {
    try {
      const blob = await exportCurrentPageAsJpg(engine, { scale: 2 })
      const title = engine.state.doc.name || 'Diagrama'
      const page = engine.state.currentPage().name || 'pagina'
      downloadBlob(blob, `${sanitizeFilename(`${title}-${page}`)}.jpg`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo generar el JPG.'
      window.alert(message)
    }
  }

  const handleExportPdf = async (): Promise<void> => {
    try {
      const blob = await exportDocumentAsPdf(engine, { scale: 2 })
      downloadBlob(blob, `${sanitizeFilename(engine.state.doc.name || 'Diagrama')}.pdf`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo generar el PDF.'
      window.alert(message)
    }
  }

  const handleCloudSave = async (): Promise<void> => {
    if (authStatus !== 'authenticated') {
      window.alert('Para guardar en la nube debes iniciar sesion. El diagrama local se mantiene intacto.')
      return
    }
    if (activeProject?.source === 'remote') return
    const thumbnail = await renderCurrentPageThumbnail(engine).catch(() => null)
    const project = await saveDocumentAsRemote(engine.serialize(), engine.state.doc.name, thumbnail)
    if (project) navigate(`/editor/${project.id}`, { replace: true })
  }

  const handleBackToDashboard = async (): Promise<void> => {
    engine.commitEdit()
    if (activeProject) {
      await saveActiveProject(engine.serialize(), engine.state.doc.name)
    }
    navigate('/')
  }

  const saveText = saveStatus === 'dirty'
    ? 'Sin guardar'
    : saveStatus === 'saving'
      ? 'Guardando'
      : saveStatus === 'saved'
        ? activeProject?.source === 'remote' ? 'Guardado en nube' : 'Guardado local'
        : saveStatus === 'error'
          ? 'Error al guardar'
          : saveStatus === 'conflict'
            ? 'Conflicto remoto'
            : activeProject?.source === 'remote'
              ? 'Nube'
              : 'Local'

  return (
    <header>
      <div className="header-pill">
        <button className="icon-btn" title="Volver al dashboard" aria-label="Volver al dashboard" onClick={() => void handleBackToDashboard()}>
          <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /><path d="M9 12h12" /><path d="M3 4v16" /></svg>
        </button>
        <div className="pill-divider" />
        <Logo />
        {editing ? (
          <input
            ref={inputRef}
            className="board-name-input"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancelRename() }}
          />
        ) : (
          <span
            className="board-name" title="Doble click para renombrar"
            onDoubleClick={() => { setDraft(engine.state.doc.name); setEditing(true); }}
          >
            {engine.state.doc.name}
          </span>
        )}
      </div>

      <div className="spacer" />

      <div className="header-pill">
        <input
          ref={importRef}
          type="file"
          accept=".drwy,application/json"
          hidden
          onChange={event => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void handleImport(file)
          }}
        />
        <button className="icon-btn" title="Importar archivo .drwy" aria-label="Importar archivo .drwy" onClick={() => importRef.current?.click()}>
          <svg viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></svg>
        </button>
        <button className="icon-btn" title="Exportar archivo .drwy" aria-label="Exportar archivo .drwy" onClick={handleExportDrwy}>
          <svg viewBox="0 0 24 24"><path d="M12 4v12M7 11l5 5 5-5M5 20h14" /></svg>
        </button>
        <button className="icon-btn" title="Exportar página como JPG" aria-label="Exportar página como JPG" onClick={() => void handleExportJpg()}>
          <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8" cy="9" r="1.5" /><path d="m4 17 5-5 4 4 2-2 5 5" /></svg>
        </button>
        <button className="icon-btn" title="Exportar documento como PDF" aria-label="Exportar documento como PDF" onClick={() => void handleExportPdf()}>
          <svg viewBox="0 0 24 24"><path d="M6 2h8l4 4v16H6z" /><path d="M14 2v5h5M8 15h8M8 18h5M8 12h8" /></svg>
        </button>
        <button className={activeProject?.source === 'remote' ? 'toggled icon-btn' : 'icon-btn'} title="Guardar en la nube" aria-label="Guardar en la nube" onClick={() => void handleCloudSave()}>
          <svg viewBox="0 0 24 24"><path d="M7 18h10a4 4 0 0 0 .7-7.94A6 6 0 0 0 6.1 8.5 4.5 4.5 0 0 0 7 18z" /><path d="M12 12v7M9 16l3 3 3-3" /></svg>
        </button>
        <span className="save-status">{saveText}</span>
        <div className="pill-divider" />
        <ThemeToggle />
        <div className="pill-divider" />
        <button
          className={settings.grid ? 'toggled icon-btn' : 'icon-btn'}
          title="Cuadrícula"
          onClick={() => engine.updateSettings({ grid: !settings.grid })}
        >
          <svg viewBox="0 0 24 24"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /></svg>
        </button>
        <div className="pill-divider" />
        <button className="icon-btn" title="Alejar" onClick={() => engine.zoomBy(0.9)}>
          <svg viewBox="0 0 24 24"><path d="M5 12h14" /></svg>
        </button>
        <button className="icon-btn" title="Acercar" onClick={() => engine.zoomBy(1.1)}>
          <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <button className="icon-btn" title="Centrar vista" onClick={() => engine.centerView()}>
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
        </button>
        <div className="pill-divider" />
        <button className="icon-btn" title="Velocidad de animación" onClick={() => toggleAnimationModal(true)}>
          <svg viewBox="0 0 24 24"><path d="M12 8v4l3 2" /><circle cx="12" cy="12" r="9" /></svg>
        </button>
        <div className="pill-divider" />
        <button className="icon-btn primary" title="Reproducir / pausar (Espacio)" onClick={() => engine.togglePlay()}>
          {engine.playing
            ? <svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
            : <svg viewBox="0 0 24 24"><path d="M5 3l16 9-16 9z" /></svg>
          }
        </button>
      </div>
    </header>
  )
}
