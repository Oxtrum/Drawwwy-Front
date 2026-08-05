import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardHeader } from '../components/dashboard/dashboard-header'
import { ProjectCard } from '../components/dashboard/project-card'
import { useAuthStore } from '../lib/stores/auth-store'
import { useProjectStore } from '../lib/stores/project-store'
import type { Project } from '../lib/stores/project-store'

function CreateTile({ onCreate }: { onCreate: () => void }) {
  return (
    <button className="create-tile" onClick={onCreate}>
      <span className="create-tile-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      <strong>Nuevo tablero</strong>
      <span>Empieza con un lienzo en blanco</span>
    </button>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="dashboard-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M3 9h18M8 4v5" />
      </svg>
      <h2>Todavia no tienes tableros</h2>
      <p>Crea tu primer tablero para empezar a modelar arquitecturas, redes o cualquier diagrama.</p>
      <button className="primary" onClick={onCreate}>
        + Crear tu primer tablero
      </button>
    </div>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const projects = useProjectStore(s => s.projects)
  const loading = useProjectStore(s => s.loading)
  const error = useProjectStore(s => s.error)
  const createProject = useProjectStore(s => s.createProject)
  const deleteProject = useProjectStore(s => s.deleteProject)
  const renameProject = useProjectStore(s => s.renameProject)
  const authStatus = useAuthStore(s => s.status)
  const user = useAuthStore(s => s.user)
  const [query, setQuery] = useState('')
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null)
  const [pendingRename, setPendingRename] = useState<Project | null>(null)
  const [renameDraft, setRenameDraft] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? projects.filter(p => p.name.toLowerCase().includes(q)) : projects
  }, [projects, query])

  const guestCount = projects.filter(p => p.source === 'guest').length
  const firstName = user?.name?.split(/\s+/)[0]

  const handleCreate = async (): Promise<void> => {
    const project = await createProject()
    navigate(`/editor/${project.id}`)
  }

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
      <DashboardHeader query={query} onQueryChange={setQuery} />

      <div className="dashboard">
        <section className="dash-hero">
          <div className="dash-hero-text">
            <h1>{firstName ? `Hola, ${firstName}` : 'Tus tableros'}</h1>
            <p>
              Modela arquitecturas, redes y sistemas — y dale play para ver cómo fluyen los datos
              por tus diagramas.
            </p>
          </div>
          <button className="primary dash-hero-cta" onClick={() => void handleCreate()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nuevo tablero
          </button>
        </section>

        {/* Solo para invitados con trabajo en riesgo: sin tableros locales no
            hay nada que perder y el aviso sería ruido. */}
        {authStatus === 'guest' && guestCount > 0 && (
          <aside className="dash-notice">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17.5 19a4.5 4.5 0 0 0 .5-9 6 6 0 0 0-11.5-1.5A4 4 0 0 0 6.5 19Z" />
              <path d="M12 12v5M9.5 14.5 12 12l2.5 2.5" />
            </svg>
            <p>
              <strong>
                {guestCount === 1 ? 'Tu tablero vive' : `Tus ${guestCount} tableros viven`} solo en este navegador.
              </strong>
              {' '}Inicia sesión para guardarlos en la nube y abrirlos desde cualquier dispositivo.
            </p>
            <button className="primary login-btn" onClick={() => navigate('/login')}>
              Guardar en la nube
            </button>
          </aside>
        )}

        {error && <p className="hint">{error}</p>}

        {loading ? (
          <div className="dashboard-grid">
            {[0, 1, 2, 3].map(i => <div key={i} className="project-skeleton" />)}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState onCreate={() => void handleCreate()} />
        ) : (
          <>
            <div className="dash-section-head">
              <h2>{query ? 'Resultados' : 'Recientes'}</h2>
              <span className="dash-count">
                {filtered.length} {filtered.length === 1 ? 'tablero' : 'tableros'}
              </span>
            </div>

            {filtered.length === 0 ? (
              <p className="dash-noresults">
                Ningún tablero coincide con «{query.trim()}».
                <button onClick={() => setQuery('')}>Limpiar búsqueda</button>
              </p>
            ) : (
              <div className="dashboard-grid">
                {/* La baldosa de creación solo en la vista completa: dentro de
                    unos resultados de búsqueda no es un resultado. */}
                {!query && <CreateTile onCreate={() => void handleCreate()} />}
                {filtered.map(p => (
                  <ProjectCard key={p.id} project={p} onRequestRename={openRename} onRequestDelete={setPendingDelete} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {pendingRename && (
        <div className="overlay" style={{ display: 'flex' }} onClick={() => setPendingRename(null)}>
          <div className="card dashboard-modal" onClick={ev => ev.stopPropagation()}>
            <h2>Renombrar tablero</h2>
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
            <h2>Eliminar tablero</h2>
            <p className="hint">
              {pendingDelete.source === 'guest'
                ? `"${pendingDelete.name}" es un tablero local guardado solo en este navegador. Si lo eliminas, no se podra recuperar desde la nube.`
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
