import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthCallbackPage } from './routes/auth-callback'
import { DashboardPage } from './routes/dashboard'
import { EditorPage } from './routes/editor'
import { LoginPage } from './routes/login'
import { useAuthStore } from './lib/stores/auth-store'
import { useProjectStore } from './lib/stores/project-store'

export default function App() {
  const initAuth = useAuthStore(s => s.init)
  const authStatus = useAuthStore(s => s.status)
  const loadProjects = useProjectStore(s => s.loadProjects)

  useEffect(() => {
    void initAuth()
  }, [initAuth])

  useEffect(() => {
    if (authStatus !== 'unknown') void loadProjects()
  }, [authStatus, loadProjects])

  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth-callback" element={<AuthCallbackPage />} />
      <Route path="/editor" element={<EditorPage />} />
      <Route path="/editor/:id" element={<EditorPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
