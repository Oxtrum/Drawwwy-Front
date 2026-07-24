import { useEditorStore } from '../../stores/editor-store'
import { addImageFromBlob } from '../../canvas/interaction'
import type { Shape } from '../../canvas/types'
import { useRef } from 'react'

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

export function ToolRail() {
  const engine = useEditorStore(s => s.engine)
  useEditorStore(s => s.version)
  const toggleIconDrawer = useEditorStore(s => s.toggleIconDrawer)
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <nav className="rail" aria-label="Herramientas">
      <button
        className={engine.mode === 'select' && !engine.pendingShape && !engine.pendingIcon ? 'toggled' : ''}
        title="Seleccionar / mover (V)"
        onClick={() => engine.setMode('select')}
      >
        <svg viewBox="0 0 24 24"><path d="M6 3l12 9-5.5 1L10 19z" /></svg>Mover
      </button>
      <button
        className={engine.mode === 'connect' ? 'toggled' : ''}
        title="Conectar con clics (C)"
        onClick={() => engine.setMode('connect')}
      >
        <svg viewBox="0 0 24 24"><circle cx="5" cy="19" r="2.4" /><circle cx="19" cy="5" r="2.4" /><path d="M7 17L17 7" /></svg>Flecha
      </button>
      <hr />
      {SHAPES.map(s => (
        <button
          key={s.shape}
          className={engine.pendingShape === s.shape ? 'toggled' : ''}
          title={s.title}
          onClick={() => engine.selectShape(engine.pendingShape === s.shape ? null : s.shape)}
        >
          <svg viewBox="0 0 24 24">{s.path}</svg>{s.label}
        </button>
      ))}
      <hr />
      <button title="Iconos cloud (GCP, AWS, Azure…)" onClick={() => toggleIconDrawer()}>
        <svg viewBox="0 0 24 24"><path d="M7 17a4 4 0 0 1 0-8 5.5 5.5 0 0 1 10.6 1.4A3.5 3.5 0 0 1 17 17z" /></svg>Iconos
      </button>
      <button title="Insertar imagen (o pega con Ctrl+V)" onClick={() => fileRef.current?.click()}>
        <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M4 17l5-5 4 4 3-3 4 4" /></svg>Imagen
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={ev => {
          const f = ev.target.files?.[0]
          if (f) addImageFromBlob(engine, f)
          ev.target.value = ''
        }}
      />
    </nav>
  )
}
