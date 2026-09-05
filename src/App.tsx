import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
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
    <Outlet />
  )
}
