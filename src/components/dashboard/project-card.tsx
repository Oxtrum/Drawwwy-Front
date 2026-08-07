import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Project } from '../../lib/stores/project-store'
import { useClickOutside } from '../../lib/hooks/use-click-outside'
import { relativeTime } from '../../lib/utils'
import { BoardPlaceholder } from './board-placeholder'

interface ProjectCardProps {
  project: Project
  onRequestRename: (project: Project) => void
  onRequestDelete: (project: Project) => void
  onRequestDuplicate: (project: Project) => void
}

export function ProjectCard({ project, onRequestRename, onRequestDelete, onRequestDuplicate }: ProjectCardProps) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useClickOutside(menuRef, () => setMenuOpen(false), menuOpen)

  const requestRename = (): void => {
    setMenuOpen(false)
    onRequestRename(project)
  }

  return (
    <div
      className="project-card"
      onClick={() => navigate(`/editor/${project.id}`)}
    >
      <div className="preview">
        {project.thumbnailUrl
          ? <img src={project.thumbnailUrl} alt="" />
          : <BoardPlaceholder seed={project.id} />
        }
        <span className="open-hint">Abrir</span>
      </div>
      <div className="meta">
        <div className="name-row">
          <span className="name" title={project.name}>
            {project.name}
          </span>

          <div className="ctx-wrap" ref={menuRef}>
            <button
              className="icon-btn menu-btn"
              title="Más opciones"
              aria-label="Más opciones"
              aria-expanded={menuOpen}
              onClick={ev => { ev.stopPropagation(); setMenuOpen(o => !o) }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="5" r="1.2" fill="currentColor" stroke="none" />
                <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
                <circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none" />
              </svg>
            </button>
            {menuOpen && (
              <div className="ctx-menu" onClick={ev => ev.stopPropagation()}>
                <button onClick={() => { setMenuOpen(false); onRequestDuplicate(project) }}>Duplicar</button>
                {project.capabilities?.edit !== false && <button onClick={requestRename}>Renombrar</button>}
                {project.capabilities?.delete !== false && <button
                  className="danger"
                  onClick={() => { setMenuOpen(false); onRequestDelete(project) }}
                >
                  Eliminar
                </button>}
              </div>
            )}
          </div>
        </div>
        <div className="meta-row">
          <span className="date">Editado {relativeTime(project.updatedAt)}</span>
          {project.access && project.access !== 'owner' && (
            <span className={`access-badge ${project.access === 'editor' ? 'can-edit' : 'read-only'}`}>
              {project.access === 'editor' ? 'Puede editar' : 'Solo lectura'}
            </span>
          )}
          <span className={project.source === 'remote' ? 'badge cloud' : 'badge'}>
            {project.source === 'remote' ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.5 19a4.5 4.5 0 0 0 .5-9 6 6 0 0 0-11.5-1.5A4 4 0 0 0 6.5 19Z" />
                </svg>
                Nube
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="12" rx="2" />
                  <path d="M2 20h20" />
                </svg>
                Local
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  )
}
