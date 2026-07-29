import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClickOutside } from '../../lib/hooks/use-click-outside'
import { useAuthStore } from '../../lib/stores/auth-store'
import { useProjectStore } from '../../lib/stores/project-store'
import { Logo } from '../ui/logo'
import { ThemeToggle } from '../ui/theme-toggle'

export function DashboardHeader() {
  const navigate = useNavigate()
  const createProject = useProjectStore(s => s.createProject)
  const authStatus = useAuthStore(s => s.status)
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)

  useClickOutside(accountRef, () => setAccountOpen(false), accountOpen)

  const handleCreate = async (): Promise<void> => {
    const project = await createProject()
    navigate(`/editor/${project.id}`)
  }

  const handleLogin = (): void => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
    if (!clientId) {
      window.alert('Falta configurar VITE_GOOGLE_CLIENT_ID para iniciar sesion con Google.')
      return
    }
    const redirectUri = `${window.location.origin}/auth-callback`
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.searchParams.set('client_id', clientId)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', 'openid email profile')
    url.searchParams.set('access_type', 'offline')
    url.searchParams.set('prompt', 'select_account')
    window.location.href = url.toString()
  }

  const initials = (user?.name || user?.email || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('')

  return (
    <header className="dashboard-header">
      <Logo />
      <div className="spacer" />
      {authStatus === 'authenticated' ? (
        <div className="account-menu-wrap" ref={accountRef}>
          <button
            className="account-btn"
            title={user?.email || 'Sesion activa'}
            aria-label="Cuenta"
            aria-expanded={accountOpen}
            onClick={() => setAccountOpen(open => !open)}
          >
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="" />
              : <span>{initials}</span>
            }
          </button>
          {accountOpen && (
            <div className="account-menu">
              <div className="account-meta">
                <strong>{user?.name || 'Sesion activa'}</strong>
                {user?.email && <span>{user.email}</span>}
              </div>
              <button
                onClick={() => {
                  setAccountOpen(false)
                  logout()
                }}
              >
                Salir
              </button>
            </div>
          )}
        </div>
      ) : (
        <button onClick={handleLogin}>
          Iniciar sesion
        </button>
      )}
      <ThemeToggle />
      <button className="primary" onClick={() => void handleCreate()}>
        + Crear board
      </button>
    </header>
  )
}
