import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../lib/stores/auth-store'
import { useProjectStore } from '../lib/stores/project-store'

export function AuthCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const loginWithGoogleCode = useAuthStore(s => s.loginWithGoogleCode)
  const loadProjects = useProjectStore(s => s.loadProjects)
  const [message, setMessage] = useState('Conectando sesion...')

  useEffect(() => {
    const code = params.get('code')
    if (!code) {
      setMessage('No se recibio codigo de Google.')
      return
    }
    void loginWithGoogleCode(code)
      .then(loadProjects)
      .then(() => navigate('/', { replace: true }))
      .catch(error => {
        setMessage(error instanceof Error ? error.message : 'No se pudo iniciar sesion.')
      })
  }, [loadProjects, loginWithGoogleCode, navigate, params])

  return (
    <div className="dashboard">
      <div className="dashboard-empty">
        <h2>{message}</h2>
      </div>
    </div>
  )
}
