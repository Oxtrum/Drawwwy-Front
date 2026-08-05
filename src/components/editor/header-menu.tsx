import { useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { exportCurrentPageAsJpg, exportDocumentAsPdf, renderCurrentPageThumbnail } from '../../canvas/export'
import { createDrwyFile, downloadBlob, DRWY_MIME, parseDrwyText, sanitizeFilename } from '../../lib/drwy/format'
import { useAuthStore } from '../../lib/stores/auth-store'
import { useProjectStore } from '../../lib/stores/project-store'
import { useClickOutside } from '../../hooks/use-click-outside'
import type { CanvasEngine } from '../../canvas/engine'

function MoreDotsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

function MenuItem({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button className="ctx-item" onClick={onClick}>
      <span className="ctx-item-icon">{icon}</span>
      <span className="ctx-item-label">{label}</span>
    </button>
  )
}

function ImportIcon() {
  return <svg viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></svg>
}
function ExportIcon() {
  return <svg viewBox="0 0 24 24"><path d="M12 4v12M7 11l5 5 5-5M5 20h14" /></svg>
}
function JpgIcon() {
  return <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8" cy="9" r="1.5" /><path d="m4 17 5-5 4 4 2-2 5 5" /></svg>
}
function PdfIcon() {
  return <svg viewBox="0 0 24 24"><path d="M6 2h8l4 4v16H6z" /><path d="M14 2v5h5M8 15h8M8 18h5M8 12h8" /></svg>
}
function CloudIcon() {
  return <svg viewBox="0 0 24 24"><path d="M7 18h10a4 4 0 0 0 .7-7.94A6 6 0 0 0 6.1 8.5 4.5 4.5 0 0 0 7 18z" /><path d="M12 12v7M9 16l3 3 3-3" /></svg>
}

interface HeaderMenuProps {
  engine: CanvasEngine
}

export function HeaderMenu({ engine }: HeaderMenuProps) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const authStatus = useAuthStore(s => s.status)
  const activeProject = useProjectStore(s => s.activeProject)
  const saveDocumentAsRemote = useProjectStore(s => s.saveDocumentAsRemote)

  useClickOutside(wrapRef, () => setOpen(false))

  const close = (): void => setOpen(false)

  const handleExportDrwy = (): void => {
    const title = engine.state.doc.name || 'Diagrama'
    const file = createDrwyFile(engine.serialize(), title)
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: DRWY_MIME })
    downloadBlob(blob, `${sanitizeFilename(file.title || 'diagrama')}.drwy`)
    close()
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
    close()
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
    close()
  }

  const handleExportPdf = async (): Promise<void> => {
    try {
      const blob = await exportDocumentAsPdf(engine, { scale: 2 })
      downloadBlob(blob, `${sanitizeFilename(engine.state.doc.name || 'Diagrama')}.pdf`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo generar el PDF.'
      window.alert(message)
    }
    close()
  }

  const handleCloudSave = async (): Promise<void> => {
    if (authStatus !== 'authenticated') {
      window.alert('Para guardar en la nube debes iniciar sesion. El diagrama local se mantiene intacto.')
      close()
      return
    }
    if (activeProject?.source === 'remote') {
      close()
      return
    }
    const thumbnail = await renderCurrentPageThumbnail(engine).catch(() => null)
    const project = await saveDocumentAsRemote(engine.serialize(), engine.state.doc.name, thumbnail)
    close()
    if (project) navigate(`/editor/${project.id}`, { replace: true })
  }

  return (
    <div className="hmenu" ref={wrapRef}>
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
      <button
        className={open ? 'toggled icon-btn' : 'icon-btn'}
        title="Más opciones"
        aria-label="Más opciones"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <MoreDotsIcon />
      </button>
      {open && (
        <div className="hmenu-menu">
          <MenuItem
            icon={<ImportIcon />}
            label="Importar .drwy"
            onClick={() => importRef.current?.click()}
          />
          <div className="ctx-sep" />
          <MenuItem icon={<ExportIcon />} label="Exportar .drwy" onClick={handleExportDrwy} />
          <MenuItem icon={<JpgIcon />} label="Exportar JPG" onClick={() => void handleExportJpg()} />
          <MenuItem icon={<PdfIcon />} label="Exportar PDF" onClick={() => void handleExportPdf()} />
          <div className="ctx-sep" />
          <MenuItem icon={<CloudIcon />} label="Guardar en la nube" onClick={() => void handleCloudSave()} />
        </div>
      )}
    </div>
  )
}