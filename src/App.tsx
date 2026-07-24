import { Navigate, Route, Routes } from 'react-router-dom'
import { EditorPage } from './routes/editor'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/editor" replace />} />
      <Route path="/editor" element={<EditorPage />} />
      <Route path="*" element={<Navigate to="/editor" replace />} />
    </Routes>
  )
}
