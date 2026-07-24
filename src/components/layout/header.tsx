import { THEMES } from '../../canvas/config'
import { useEditorStore } from '../../stores/editor-store'

export function EditorHeader() {
  const engine = useEditorStore(s => s.engine)
  useEditorStore(s => s.version)
  const settings = engine.state.settings

  return (
    <header>
      <div className="logo">
        <span>draw<b>wwy</b></span>
        <span className="dots"><span /><span /><span /></span>
      </div>
      <div className="spacer" />
      <select
        value={engine.state.doc.theme}
        title="Tema"
        onChange={ev => engine.setTheme(ev.target.value)}
      >
        {Object.keys(THEMES).map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <button
        className={settings.grid ? 'toggled' : ''}
        title="Cuadrícula"
        onClick={() => engine.updateSettings({ grid: !settings.grid })}
      >
        Cuadrícula
      </button>
      <button title="Alejar" onClick={() => engine.zoomBy(0.9)}>−</button>
      <button title="Acercar" onClick={() => engine.zoomBy(1.1)}>+</button>
      <button title="Centrar vista" onClick={() => engine.centerView()}>Centrar</button>
      <button className="primary" title="Reproducir / pausar (Espacio)" onClick={() => engine.togglePlay()}>
        {engine.playing ? 'Pausa' : 'Reproducir'}
      </button>
    </header>
  )
}
