import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import App from './App.tsx'
import { AuthCallbackPage } from './routes/auth-callback'
import { DashboardPage } from './routes/dashboard'
import { EditorPage } from './routes/editor'
import { LoginPage } from './routes/login'
import './lib/stores/theme-store'
import './styles/index.css'
import './styles/dashboard.css'
import './styles/auth.css'

const router = createBrowserRouter([{
  element: <App />,
  children: [
    { path: '/', element: <DashboardPage /> },
    { path: '/login', element: <LoginPage /> },
    { path: '/auth-callback', element: <AuthCallbackPage /> },
    { path: '/editor', element: <EditorPage /> },
    { path: '/editor/p/:publicID', element: <EditorPage /> },
    { path: '/editor/local/:localRef', element: <EditorPage /> },
    { path: '/editor/:id/local', element: <EditorPage /> },
    { path: '/editor/:id', element: <EditorPage /> },
    { path: '*', element: <Navigate to="/" replace /> },
  ],
}])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
