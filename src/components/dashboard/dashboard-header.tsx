import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../../lib/stores/project-store'
import { Logo } from '../ui/logo'
import { ThemeToggle } from '../ui/theme-toggle'

export function DashboardHeader() {
  const navigate = useNavigate()
  const createProject = useProjectStore(s => s.createProject)

  const handleCreate = (): void => {
    const project = createProject()
    navigate(`/editor/${project.id}`)
  }

  return (
    <header className="dashboard-header">
      <Logo />
      <div className="spacer" />
      <ThemeToggle />
      <button className="primary" onClick={handleCreate}>
        + Crear board
      </button>
    </header>
  )
}
