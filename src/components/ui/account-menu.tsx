import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClickOutside } from '../../lib/hooks/use-click-outside'
import { useAuthStore } from '../../lib/stores/auth-store'

/**
 * Control de sesión: avatar de Google con menú, o botón «Iniciar sesion» que
 * lleva a la portada /login. Lo comparten el header del dashboard y el del
 * editor para que el estado de cuenta se vea igual en toda la app.
 *
 * `compact` lo encoge para caber en las pills flotantes del editor, donde el
 * resto de controles miden 32px en vez de los 34px del dashboard.
 */
export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate()
  const authStatus = useAuthStore(s => s.status)
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useClickOutside(wrapRef, () => setOpen(false), open)

  // `unknown` = /auth/me todavía en vuelo. No renderizamos nada para no
  // parpadear un «Iniciar sesion» a quien ya tiene sesión abierta.
  if (authStatus === 'unknown') return null

  if (authStatus !== 'authenticated') {
    return (
      <button className={compact ? 'primary login-btn compact' : 'primary login-btn'} onClick={() => navigate('/login')}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <path d="M10 17l5-5-5-5M15 12H3" />
        </svg>
        Iniciar sesion
      </button>
    )
  }

  const initials = (user?.name || user?.email || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('')

  return (
    <div className={compact ? 'account-menu-wrap compact' : 'account-menu-wrap'} ref={wrapRef}>
      <button
        className="account-btn"
        title={user?.email || 'Sesion activa'}
        aria-label="Cuenta"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        {user?.avatar_url
          ? <img src={user.avatar_url} alt="" referrerPolicy="no-referrer" />
          : <span>{initials}</span>
        }
      </button>
      {open && (
        <div className="account-menu">
          <div className="account-meta">
            <strong>{user?.name || 'Sesion activa'}</strong>
            {user?.email && <span>{user.email}</span>}
          </div>
          <button
            onClick={() => {
              setOpen(false)
              logout()
            }}
          >
            Salir
          </button>
        </div>
      )}
    </div>
  )
}
