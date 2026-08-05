import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AuthArtwork } from '../components/auth/auth-artwork'
import { Logo } from '../components/ui/logo'
import { ThemeToggle } from '../components/ui/theme-toggle'
import { startGoogleLogin } from '../lib/auth/google'
import { useAuthStore } from '../lib/stores/auth-store'

type Intent = 'registro' | 'ingreso'

const COPY: Record<Intent, { title: string; sub: string; cta: string }> = {
  registro: {
    title: 'Crea tu cuenta',
    sub: 'Empieza gratis. Tus boards se guardan en la nube y te siguen a cualquier dispositivo.',
    cta: 'Registrarme con Google',
  },
  ingreso: {
    title: 'Bienvenido de vuelta',
    sub: 'Entra con la misma cuenta de Google y retoma tus boards donde los dejaste.',
    cta: 'Entrar con Google',
  },
}

const BENEFITS = [
  'Anima el flujo de tus arquitecturas, no solo las dibujes.',
  'Cientos de iconos de nube, formas y conectores inteligentes.',
  'Exporta a PNG, SVG, GIF o PDF con un clic.',
]

/** Marca oficial de Google: colores fijos, nunca heredan el tema. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.1z" />
      <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.1 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.8 28.2c-.4-1.3-.7-2.7-.7-4.2s.3-2.9.7-4.2v-5.7H4.5A22 22 0 0 0 2 24c0 3.6.9 6.9 2.5 9.9l7.3-5.7z" />
      <path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.1 29.9 2 24 2 15.4 2 8.1 6.9 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9 12.2-9z" />
    </svg>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const authStatus = useAuthStore(s => s.status)
  const [intent, setIntent] = useState<Intent>('registro')
  const [error, setError] = useState<string | null>(null)

  // Quien ya tiene sesion no ve la portada: /login es solo la puerta de entrada.
  if (authStatus === 'authenticated') return <Navigate to="/" replace />

  const copy = COPY[intent]

  const handleGoogle = (): void => {
    const result = startGoogleLogin()
    if (!result.ok) setError(result.error ?? 'No se pudo iniciar sesion con Google.')
  }

  return (
    <div className="auth-page">
      <section className="auth-pitch">
        <div className="auth-pitch-inner">
          <span className="auth-badge">Editor de diagramas animados</span>
          <h1>
            Regístrate hoy en Drawwwy
            <em> sin ningún costo</em>
          </h1>
          <p className="auth-pitch-lead">
            Diseña arquitecturas, redes y sistemas que se explican solos: dale play y mira cómo
            los datos recorren tu diagrama.
          </p>

          <div className="auth-art-frame">
            <AuthArtwork />
          </div>

          <ul className="auth-benefits">
            {BENEFITS.map(item => (
              <li key={item}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {item}
              </li>
            ))}
          </ul>

          <p className="auth-pitch-foot">Sin tarjeta de crédito · Gratis para siempre</p>
        </div>
      </section>

      <section className="auth-form">
        <header className="auth-form-top">
          <Logo />
          <ThemeToggle />
        </header>

        <div className="auth-form-body">
          <div className="auth-tabs" role="tablist" aria-label="Acceso">
            <button
              type="button"
              role="tab"
              aria-selected={intent === 'registro'}
              className={intent === 'registro' ? 'active' : undefined}
              onClick={() => setIntent('registro')}
            >
              Crear cuenta
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={intent === 'ingreso'}
              className={intent === 'ingreso' ? 'active' : undefined}
              onClick={() => setIntent('ingreso')}
            >
              Iniciar sesión
            </button>
          </div>

          <h2>{copy.title}</h2>
          <p className="auth-sub">{copy.sub}</p>

          <button type="button" className="auth-google" onClick={handleGoogle}>
            <GoogleMark />
            {copy.cta}
          </button>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <div className="auth-divider"><span>o</span></div>

          <button type="button" className="auth-guest" onClick={() => navigate('/')}>
            Seguir sin cuenta
          </button>
          <p className="auth-guest-note">
            Los boards de invitado se guardan solo en este navegador. Al crear tu cuenta se
            suben a la nube.
          </p>

          <p className="auth-legal">
            Al continuar aceptas los Términos de servicio y la Política de privacidad de Drawwwy.
          </p>
        </div>
      </section>
    </div>
  )
}
