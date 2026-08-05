import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../../lib/stores/project-store'
import { AccountMenu } from '../ui/account-menu'
import { Logo } from '../ui/logo'
import { ThemeToggle } from '../ui/theme-toggle'

interface DashboardHeaderProps {
  /** El filtro lo posee la página, que es quien pinta la lista filtrada. */
  query: string
  onQueryChange: (value: string) => void
}

export function DashboardHeader({ query, onQueryChange }: DashboardHeaderProps) {
  const navigate = useNavigate()
  const createProject = useProjectStore(s => s.createProject)

  const handleCreate = async (): Promise<void> => {
    const project = await createProject()
    navigate(`/editor/${project.id}`)
  }

  return (
    <header className="dashboard-header">
      <Logo />

      <div className="dash-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.6-3.6" />
        </svg>
        <input
          type="search"
          value={query}
          placeholder="Buscar en tus tableros"
          aria-label="Buscar en tus tableros"
          onChange={ev => onQueryChange(ev.target.value)}
          onKeyDown={ev => { if (ev.key === 'Escape') onQueryChange('') }}
        />
        {query && (
          <button className="dash-search-clear" aria-label="Limpiar busqueda" onClick={() => onQueryChange('')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </div>

      <div className="spacer" />
      <AccountMenu />
      <ThemeToggle />
      <button className="primary create-btn" onClick={() => void handleCreate()}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>Crear tablero</span>
      </button>
    </header>
  )
}
