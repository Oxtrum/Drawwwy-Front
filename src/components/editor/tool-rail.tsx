import { useRef } from 'react'
import { addImageFromBlob } from '../../canvas/interaction'
import { useEditorStore } from '../../lib/stores/editor-store'

export function ToolRail() {
  const engine = useEditorStore(s => s.engine)
  useEditorStore(s => s.version)
  const shapesPanelOpen = useEditorStore(s => s.shapesPanelOpen)
  const toggleShapesPanel = useEditorStore(s => s.toggleShapesPanel)
  const iconDrawerOpen = useEditorStore(s => s.iconDrawerOpen)
  const toggleIconDrawer = useEditorStore(s => s.toggleIconDrawer)
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <nav className="rail" aria-label="Herramientas">
      <button
        className={engine.mode === 'select' && !engine.pendingShape && !engine.pendingIcon ? 'toggled' : ''}
        aria-label="Seleccionar / mover (V)"
        onClick={() => engine.setMode('select')}
      >
        <svg viewBox="0 0 24 24"><path d="M6 3l12 9-5.5 1L10 19z" /></svg>
        <span className="tip">Mover</span>
      </button>
      <button
        className={engine.mode === 'connect' ? 'toggled' : ''}
        aria-label="Conectar con clics (C)"
        onClick={() => engine.setMode('connect')}
      >
        <svg viewBox="0 0 24 24"><circle cx="5" cy="19" r="2.4" /><circle cx="19" cy="5" r="2.4" /><path d="M7 17L17 7" /></svg>
        <span className="tip">Flecha</span>
      </button>

      <hr />

      <button
        className={shapesPanelOpen ? 'toggled' : ''}
        aria-label="Figuras"
        onClick={() => { if (iconDrawerOpen) toggleIconDrawer(false); toggleShapesPanel() }}
      >
        <svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5" /><circle cx="16.5" cy="7.5" r="3.5" /><path d="M12 17l-4-7h8z" /></svg>
        <span className="tip">Figuras</span>
      </button>

      <button
        className={iconDrawerOpen ? 'toggled' : ''}
        aria-label="Iconos cloud (GCP, AWS, Azure…)"
        onClick={() => { toggleShapesPanel(false); toggleIconDrawer() }}
      >
        <svg viewBox="0 0 24 24"><path d="M7 17a4 4 0 0 1 0-8 5.5 5.5 0 0 1 10.6 1.4A3.5 3.5 0 0 1 17 17z" /></svg>
        <span className="tip">Iconos</span>
      </button>

      <button aria-label="Insertar imagen (o pega con Ctrl+V)" onClick={() => fileRef.current?.click()}>
        <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M4 17l5-5 4 4 3-3 4 4" /></svg>
        <span className="tip">Imagen</span>
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
