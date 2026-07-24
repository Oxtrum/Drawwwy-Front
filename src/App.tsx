import { Navigate, Route, Routes } from 'react-router-dom'
import { DashboardPage } from './routes/dashboard'
import { EditorPage } from './routes/editor'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/editor" element={<EditorPage />} />
      <Route path="/editor/:id" element={<EditorPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
