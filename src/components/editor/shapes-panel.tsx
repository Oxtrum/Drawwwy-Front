import { useEditorStore } from '../../lib/stores/editor-store'
import type { Shape } from '../../canvas/types'

const SHAPES: Array<{ shape: Shape; label: string; title: string; path: React.ReactNode }> = [
  { shape: 'rect', label: 'Caja', title: 'Caja', path: <rect x="3" y="6" width="18" height="12" rx="3" /> },
  {
    shape: 'cylinder', label: 'BD', title: 'Base de datos',
    path: <><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6" /></>,
  },
  { shape: 'diamond', label: 'Rombo', title: 'Decisión', path: <path d="M12 3l9 9-9 9-9-9z" /> },
  { shape: 'circle', label: 'Círculo', title: 'Círculo', path: <circle cx="12" cy="12" r="9" /> },
  { shape: 'hex', label: 'Hex', title: 'Hexágono', path: <path d="M7 4h10l4 8-4 8H7l-4-8z" /> },
  { shape: 'text', label: 'Texto', title: 'Solo texto', path: <path d="M5 6h14M12 6v13" /> },
]

export function ShapesPanel() {
  const engine = useEditorStore(s => s.engine)
  const open = useEditorStore(s => s.shapesPanelOpen)
  const toggleShapesPanel = useEditorStore(s => s.toggleShapesPanel)
  useEditorStore(s => s.version)

  if (!open) return null

  return (
    <div className="shapes-panel">
      {SHAPES.map(s => (
        <button
          key={s.shape}
          className={engine.pendingShape === s.shape ? 'toggled' : ''}
          aria-label={s.title}
          onClick={() => {
            engine.selectShape(engine.pendingShape === s.shape ? null : s.shape)
            toggleShapesPanel(false)
          }}
        >
          <svg viewBox="0 0 24 24">{s.path}</svg>
          <span className="tip">{s.label}</span>
        </button>
      ))}
    </div>
  )
}