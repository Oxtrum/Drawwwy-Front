import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LogoMark } from '../components/ui/logo'
import { ApiError } from '../lib/api/client'
import { useAuthStore } from '../lib/stores/auth-store'
import { useProjectStore } from '../lib/stores/project-store'

/** Fases reales del regreso de Google, no un temporizador decorativo. */
type Phase = 'google' | 'projects' | 'ready' | 'error'

const STEPS: Array<{ phase: Phase; label: string }> = [
  { phase: 'google', label: 'Verificando tu cuenta de Google' },
  { phase: 'projects', label: 'Cargando tus tableros' },
]

const ORDER: Phase[] = ['google', 'projects', 'ready']

const HEADING: Record<Phase, string> = {
  google: 'Entrando a Drawwwy',
  projects: 'Casi listo',
  ready: 'Todo listo',
  error: 'No pudimos iniciar sesion',
}

/**
 * El mensaje del backend ya viene redactado para el usuario, pero un fallo de
 * red rechaza el fetch con un `TypeError: Failed to fetch` del navegador, que
 * no se le puede enseñar a nadie.
 */
function describeError(err: unknown): string {
  if (err instanceof ApiError) return err.message
  return 'No pudimos conectar con el servidor. Revisa tu conexion e intentalo de nuevo.'
}

function StepIcon({ state }: { state: 'done' | 'active' | 'pending' }) {
  if (state === 'done') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    )
  }
  return <span className="step-dot" />
}

export function AuthCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const loginWithGoogleCode = useAuthStore(s => s.loginWithGoogleCode)
  const user = useAuthStore(s => s.user)
  const loadProjects = useProjectStore(s => s.loadProjects)
  const [phase, setPhase] = useState<Phase>('google')
  const [error, setError] = useState('')
  // Los codigos de Google son de un solo uso: sin este guardia el doble montaje
  // de StrictMode en desarrollo lo canjea dos veces y el segundo intento falla.
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const code = params.get('code')
    if (!code) {
      setPhase('error')
      setError(params.get('error') === 'access_denied'
        ? 'Cancelaste el acceso con Google.'
        : 'No recibimos el codigo de Google. Vuelve a intentarlo desde la pantalla de acceso.')
      return
    }

    void loginWithGoogleCode(code)
      .then(() => {
        setPhase('projects')
        return loadProjects()
      })
      .then(() => {
        setPhase('ready')
        // Medio segundo para que el estado final se lea; sin esto la pantalla
        // salta del paso 2 al dashboard y solo se percibe un parpadeo.
        setTimeout(() => navigate('/', { replace: true }), 500)
      })
      .catch((err: unknown) => {
        setPhase('error')
        setError(describeError(err))
      })
  }, [loadProjects, loginWithGoogleCode, navigate, params])

  const firstName = user?.name?.split(/\s+/)[0]
  const heading = phase === 'ready' && firstName ? `Hola, ${firstName}` : HEADING[phase]

  return (
    <div className="auth-transition">
      <div className="auth-transition-card">
        <div className={`auth-transition-mark phase-${phase}`}>
          <LogoMark size={40} />
        </div>

        {phase === 'error' ? (
          <div className="auth-transition-icon error" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8v5M12 17h.01" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </div>
        ) : phase === 'ready' ? (
          <div className="auth-transition-icon done" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
        ) : (
          // El indicador de progreso es el lenguaje del producto —datos
          // recorriendo una arista— en lugar de una rueda genérica.
          <div className="auth-transition-flow" aria-hidden="true">
            <span /><span /><span />
          </div>
        )}

        <h1 aria-live="polite">{heading}</h1>

        {phase === 'error' ? (
          <>
            <p className="auth-transition-sub">{error}</p>
            <div className="auth-transition-actions">
              <button className="primary login-btn" onClick={() => navigate('/login', { replace: true })}>
                Volver a intentar
              </button>
              <button onClick={() => navigate('/', { replace: true })}>Seguir sin cuenta</button>
            </div>
          </>
        ) : (
          <ol className="auth-steps">
            {STEPS.map(step => {
              const state = ORDER.indexOf(phase) > ORDER.indexOf(step.phase)
                ? 'done'
                : phase === step.phase ? 'active' : 'pending'
              return (
                <li key={step.phase} className={state}>
                  <StepIcon state={state} />
                  {step.label}
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}
