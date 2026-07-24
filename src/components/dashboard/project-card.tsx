import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Project } from '../../lib/stores/project-store'
import { useProjectStore } from '../../lib/stores/project-store'
import { useClickOutside } from '../../lib/hooks/use-click-outside'
import { relativeTime } from '../../lib/utils'

interface ProjectCardProps {
  project: Project
  onRequestDelete: (project: Project) => void
}

export function ProjectCard({ project, onRequestDelete }: ProjectCardProps) {
  const navigate = useNavigate()
  const renameProject = useProjectStore(s => s.renameProject)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(project.name)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useClickOutside(menuRef, () => setMenuOpen(false), menuOpen)

  const commitRename = (): void => {
    setEditing(false)
    if (name.trim() && name.trim() !== project.name) renameProject(project.id, name)
    else setName(project.name)
  }

  const startRename = (): void => {
    setMenuOpen(false)
    setName(project.name)
    setEditing(true)
  }

  return (
    <div
      className="project-card"
      onClick={() => !editing && navigate(`/editor/${project.id}`)}
    >
      <div className="preview">
        <span>{project.name}</span>
      </div>
      <div className="meta">
        <div className="name-row">
          {editing ? (
            <input
              className="name-input"
              autoFocus
              value={name}
              onClick={ev => ev.stopPropagation()}
              onChange={ev => setName(ev.target.value)}
              onBlur={commitRename}
              onKeyDown={ev => {
                if (ev.key === 'Enter') { ev.preventDefault(); commitRename() }
                if (ev.key === 'Escape') { setName(project.name); setEditing(false) }
              }}
            />
          ) : (
            <span
              className="name"
              onClick={ev => { ev.stopPropagation(); startRename() }}
              title="Clic para renombrar"
            >
              {project.name}
            </span>
          )}

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
                <button onClick={startRename}>Renombrar</button>
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
      </div>
    </div>
  )
}
