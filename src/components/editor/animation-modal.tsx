import { useEditorStore } from '../../lib/stores/editor-store'

export function AnimationModal() {
  const engine = useEditorStore(s => s.engine)
  const open = useEditorStore(s => s.animationModalOpen)
  const toggleAnimationModal = useEditorStore(s => s.toggleAnimationModal)
  useEditorStore(s => s.version)

  if (!open) return null
  const s = engine.state.settings

  return (
    <div className="modal-backdrop" onClick={() => toggleAnimationModal(false)}>
      <div className="modal-card" onClick={ev => ev.stopPropagation()}>
        <div className="modal-head">
          <h3>Animación</h3>
          <button className="icon-btn" aria-label="Cerrar" onClick={() => toggleAnimationModal(false)}>
            <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="row">
          <label htmlFor="speedIn">Velocidad</label>
          <input id="speedIn" type="range" min="0.05" max="2" step="0.05" value={s.speed}
            onChange={ev => engine.updateSettings({ speed: +ev.target.value })} />
        </div>
        <div className="row">
          <label htmlFor="dotsIn">Puntos</label>
          <input id="dotsIn" type="range" min="1" max="8" step="1" value={s.dots}
            onChange={ev => engine.updateSettings({ dots: +ev.target.value })} />
        </div>
        <div className="row">
          <label htmlFor="buildChk">Aparición</label>
          <input id="buildChk" type="checkbox" checked={s.build}
            onChange={ev => { engine.updateSettings({ build: ev.target.checked }); engine.restartAnimation() }} />
        </div>
        <div className="row">
          <label htmlFor="staggerIn">Retardo</label>
          <input id="staggerIn" type="range" min="0" max="1.5" step="0.05" value={s.stagger}
            onChange={ev => engine.updateSettings({ stagger: +ev.target.value })} />
        </div>
      </div>
    </div>
  )
}
