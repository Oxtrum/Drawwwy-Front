import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { renderCurrentPageThumbnail } from '../../canvas/export'
import { useEditorStore } from '../../lib/stores/editor-store'
import { useProjectStore } from '../../lib/stores/project-store'
import { AccountMenu } from '../ui/account-menu'
import { Logo } from '../ui/logo'
import { ThemeToggle } from '../ui/theme-toggle'
import { HeaderMenu } from './header-menu'

export function EditorHeader() {
  const navigate = useNavigate()
  const engine = useEditorStore(s => s.engine)
  useEditorStore(s => s.version)
  const toggleAnimationModal = useEditorStore(s => s.toggleAnimationModal)
  const saveStatus = useProjectStore(s => s.saveStatus)
  const activeProject = useProjectStore(s => s.activeProject)
  const saveActiveProject = useProjectStore(s => s.saveActiveProject)
  const settings = engine.state.settings
  // Se recalcula en cada notify() del engine (la suscripción a `version` de
  // arriba), que es justo cuando se activa el flujo de una arista o el pulso
  // de un nodo.
  const hasAnimation = engine.hasAnimation()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(engine.state.doc.name)
  const inputRef = useRef<HTMLInputElement>(null)

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

  const handleBackToDashboard = async (): Promise<void> => {
    engine.commitEdit()
    if (activeProject) {
      const thumbnail = await renderCurrentPageThumbnail(engine).catch(() => null)
      await saveActiveProject(engine.serialize(), engine.state.doc.name, thumbnail)
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
        <HeaderMenu engine={engine} />
        <div className="pill-divider" />
        <button
          className="icon-btn primary"
          disabled={!hasAnimation}
          title={hasAnimation
            ? 'Reproducir / pausar (Espacio)'
            : 'Activa el flujo en alguna flecha para reproducir la animación'}
          onClick={() => engine.togglePlay()}
        >
          {/* Sin nada que animar el reloj sigue corriendo (`playing` arranca en
              true), pero un icono de pausa deshabilitado no querría decir nada:
              mostramos siempre play. */}
          {engine.playing && hasAnimation
            ? <svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
            : <svg viewBox="0 0 24 24"><path d="M5 3l16 9-16 9z" /></svg>
          }
        </button>
      </div>

      <div className="header-pill">
        <AccountMenu compact />
      </div>
    </header>
  )
}
