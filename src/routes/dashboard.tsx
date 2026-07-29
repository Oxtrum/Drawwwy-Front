import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardHeader } from '../components/dashboard/dashboard-header'
import { ProjectCard } from '../components/dashboard/project-card'
import { useProjectStore } from '../lib/stores/project-store'
import type { Project } from '../lib/stores/project-store'

function EmptyState() {
  const navigate = useNavigate()
  const createProject = useProjectStore(s => s.createProject)
  return (
    <div className="dashboard-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M3 9h18M8 4v5" />
      </svg>
      <h2>Todavia no tienes boards</h2>
      <p>Crea tu primer board para empezar a modelar arquitecturas, redes o cualquier diagrama.</p>
      <button
        className="primary"
        onClick={async () => {
          const project = await createProject()
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
  const loading = useProjectStore(s => s.loading)
  const error = useProjectStore(s => s.error)
  const deleteProject = useProjectStore(s => s.deleteProject)
  const renameProject = useProjectStore(s => s.renameProject)
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null)
  const [pendingRename, setPendingRename] = useState<Project | null>(null)
  const [renameDraft, setRenameDraft] = useState('')

  const openRename = (project: Project): void => {
    setPendingRename(project)
    setRenameDraft(project.name)
  }

  const commitRename = async (): Promise<void> => {
    if (!pendingRename) return
    const nextName = renameDraft.trim()
    if (!nextName) return
    await renameProject(pendingRename.id, nextName)
    setPendingRename(null)
  }

  const confirmDelete = async (): Promise<void> => {
    if (!pendingDelete) return
    await deleteProject(pendingDelete.id)
    setPendingDelete(null)
  }

  return (
    <>
      <DashboardHeader />
      <div className="dashboard">
        {error && <p className="hint">{error}</p>}
        {loading ? (
          <p className="hint">Cargando boards...</p>
        ) : projects.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="dashboard-grid">
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} onRequestRename={openRename} onRequestDelete={setPendingDelete} />
            ))}
          </div>
        )}
      </div>

      {pendingRename && (
        <div className="overlay" style={{ display: 'flex' }} onClick={() => setPendingRename(null)}>
          <div className="card dashboard-modal" onClick={ev => ev.stopPropagation()}>
            <h2>Renombrar board</h2>
            <label className="modal-field">
              <span>Nombre</span>
              <input
                autoFocus
                value={renameDraft}
                onChange={ev => setRenameDraft(ev.target.value)}
                onKeyDown={ev => {
                  if (ev.key === 'Enter') { ev.preventDefault(); void commitRename() }
                  if (ev.key === 'Escape') setPendingRename(null)
                }}
              />
            </label>
            <div className="actions">
              <button onClick={() => setPendingRename(null)}>Cancelar</button>
              <button className="primary" disabled={!renameDraft.trim()} onClick={() => void commitRename()}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div className="overlay" style={{ display: 'flex' }} onClick={() => setPendingDelete(null)}>
          <div className="card dashboard-modal" onClick={ev => ev.stopPropagation()}>
            <h2>Eliminar board</h2>
            <p className="hint">
              {pendingDelete.source === 'guest'
                ? `"${pendingDelete.name}" es un board local guardado solo en este navegador. Si lo eliminas, no se podra recuperar desde la nube.`
                : `"${pendingDelete.name}" se eliminara de tu cuenta. Esta accion no se puede deshacer.`
              }
            </p>
            <div className="actions">
              <button onClick={() => setPendingDelete(null)}>Cancelar</button>
              <button className="danger-solid" onClick={() => void confirmDelete()}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
