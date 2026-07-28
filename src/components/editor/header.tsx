import { exportCurrentPageAsJpg, exportDocumentAsPdf } from '../../canvas/export'
import { createDrwyFile, downloadBlob, DRWY_MIME, parseDrwyText, sanitizeFilename } from '../../lib/drwy/format'
import { useRef, useState, useEffect } from 'react';
import { useEditorStore } from '../../lib/stores/editor-store'
import { Logo } from '../ui/logo'
import { ThemeToggle } from '../ui/theme-toggle'

export function EditorHeader() {
  const engine = useEditorStore(s => s.engine)
  useEditorStore(s => s.version)
  const toggleAnimationModal = useEditorStore(s => s.toggleAnimationModal)
  const settings = engine.state.settings

  return (
    <header>
      <div className="header-pill">
        <Logo />
        {editing ? (
          <input
            ref={inputRef}
            className="board-name-input"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(engine.state.doc.name); setEditing(false); } }}
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
