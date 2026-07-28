import { ICONS, iconURL } from '../../canvas/config'
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
]

const ICON_GROUPS = ['General', 'GCP', 'AWS', 'Azure']

export function MoreShapesPanel() {
  const engine = useEditorStore(s => s.engine)
  const open = useEditorStore(s => s.moreShapesOpen)
  const toggleMoreShapes = useEditorStore(s => s.toggleMoreShapes)
  useEditorStore(s => s.version)

  if (!open) return null

  return (
    <div className="more-shapes-panel">
      <div className="more-shapes-header">
        <h4>Figuras</h4>
        <button className="close-btn" aria-label="Cerrar" onClick={() => toggleMoreShapes(false)}>
          <svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="shapesGrid">
        {SHAPES.map(s => (
          <button
            key={s.shape}
            className={engine.pendingShape === s.shape ? 'toggled' : ''}
            title={s.title}
            onClick={() => {
              engine.selectShape(engine.pendingShape === s.shape ? null : s.shape)
              toggleMoreShapes(false)
            }}
          >
            <svg viewBox="0 0 24 24">{s.path}</svg>
            {s.label}
          </button>
        ))}
      </div>

      {ICON_GROUPS.map(g => {
        const keys = Object.keys(ICONS).filter(k => ICONS[k].g === g)
        if (!keys.length) return null
        return (
          <div key={g}>
            <h4>{g}</h4>
            <div className="iconGrid">
              {keys.map(k => (
                <button
                  key={k}
                  className={engine.pendingIcon === k ? 'toggled' : ''}
                  title={ICONS[k].n}
                  onClick={() => {
                    engine.selectIcon(engine.pendingIcon === k ? null : k)
                    toggleMoreShapes(false)
                  }}
                >
                  <img src={iconURL[k]} alt="" />
                  {ICONS[k].n}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
