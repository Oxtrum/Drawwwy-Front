import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Project } from '../../lib/stores/project-store'
import { useClickOutside } from '../../lib/hooks/use-click-outside'
import { relativeTime } from '../../lib/utils'

interface ProjectCardProps {
  project: Project
  onRequestRename: (project: Project) => void
  onRequestDelete: (project: Project) => void
}

export function ProjectCard({ project, onRequestRename, onRequestDelete }: ProjectCardProps) {
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
          : <span>{project.name}</span>
        }
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
                <button onClick={requestRename}>Renombrar</button>
                <button
                  className="danger"
                  onClick={() => { setMenuOpen(false); onRequestDelete(project) }}
                >
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
        <span className="date">Editado {relativeTime(project.updatedAt)}</span>
        <span className="date">{project.source === 'remote' ? 'Nube' : 'Local'}</span>
      </div>
    </div>
  )
}
