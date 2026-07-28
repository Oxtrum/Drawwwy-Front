import { useEditorStore } from '../../lib/stores/editor-store'
import { Logo } from '../ui/logo'
import { ThemeToggle } from '../ui/theme-toggle'

export function EditorHeader() {
  const engine = useEditorStore(s => s.engine)
  useEditorStore(s => s.version)
  const toggleAnimationModal = useEditorStore(s => s.toggleAnimationModal)
  const settings = engine.state.settings

  return (
    <header>
      <div className="header-pill">
        <Logo />
        <span className="board-name">Tablero sin título</span>
      </div>

      <div className="spacer" />

      <div className="header-pill">
        <ThemeToggle />
        <div className="pill-divider" />
        <button
          className={settings.grid ? 'toggled icon-btn' : 'icon-btn'}
          title="Cuadrícula"
          onClick={() => engine.updateSettings({ grid: !settings.grid })}
        >
          <svg viewBox="0 0 24 24"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /></svg>
        </button>
        <div className="pill-divider" />
        <button className="icon-btn" title="Alejar" onClick={() => engine.zoomBy(0.9)}>
          <svg viewBox="0 0 24 24"><path d="M5 12h14" /></svg>
        </button>
        <button className="icon-btn" title="Acercar" onClick={() => engine.zoomBy(1.1)}>
          <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <button className="icon-btn" title="Centrar vista" onClick={() => engine.centerView()}>
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
        </button>
        <div className="pill-divider" />
        <button className="icon-btn" title="Velocidad de animación" onClick={() => toggleAnimationModal(true)}>
          <svg viewBox="0 0 24 24"><path d="M12 8v4l3 2" /><circle cx="12" cy="12" r="9" /></svg>
        </button>
        <div className="pill-divider" />
        <button className="icon-btn primary" title="Reproducir / pausar (Espacio)" onClick={() => engine.togglePlay()}>
          {engine.playing
            ? <svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
            : <svg viewBox="0 0 24 24"><path d="M5 3l16 9-16 9z" /></svg>
          }
        </button>
      </div>
    </header>
  )
}