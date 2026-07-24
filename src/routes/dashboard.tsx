import { useState } from 'react'
import { DashboardHeader } from '../components/dashboard/dashboard-header'
import { ProjectCard } from '../components/dashboard/project-card'
import { useProjectStore } from '../lib/stores/project-store'
import type { Project } from '../lib/stores/project-store'
import { useNavigate } from 'react-router-dom'

function EmptyState() {
  const navigate = useNavigate()
  const createProject = useProjectStore(s => s.createProject)
  return (
    <div className="dashboard-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M3 9h18M8 4v5" />
      </svg>
      <h2>Todavía no tienes boards</h2>
      <p>Crea tu primer board para empezar a modelar arquitecturas, redes o cualquier diagrama.</p>
      <button
        className="primary"
        onClick={() => {
          const project = createProject()
          navigate(`/editor/${project.id}`)
        }}
      >
        + Crear tu primer board
      </button>
    </div>
  )
}

export function DashboardPage() {
  const projects = useProjectStore(s => s.projects)
  const deleteProject = useProjectStore(s => s.deleteProject)
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null)

  return (
    <>
      <DashboardHeader />
      <div className="dashboard">
        {projects.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="dashboard-grid">
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} onRequestDelete={setPendingDelete} />
            ))}
          </div>
        )}
      </div>

      {pendingDelete && (
        <div className="overlay" style={{ display: 'flex' }} onClick={() => setPendingDelete(null)}>
          <div className="card" onClick={ev => ev.stopPropagation()}>
            <h2>Eliminar board</h2>
            <p className="hint">
              «{pendingDelete.name}» se eliminará. Esta acción no se puede deshacer.
            </p>
            <div className="actions">
              <button onClick={() => setPendingDelete(null)}>Cancelar</button>
              <button
                className="danger-solid"
                onClick={() => { deleteProject(pendingDelete.id); setPendingDelete(null) }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
