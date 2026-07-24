import { PALETTE } from '../../canvas/config'
import { useEditorStore } from '../../lib/stores/editor-store'
import type { Edge, FlowDir, Node, Route, Side } from '../../canvas/types'

function NodeProperties({ node }: { node: Node }) {
  const engine = useEditorStore(s => s.engine)
  return (
    <div>
      <h3>Nodo</h3>
      <textarea
        id="lblEdit"
        value={node.label}
        placeholder="Etiqueta"
        onChange={ev => engine.updateNode(node.id, { label: ev.target.value })}
      />
      <div className="swatches" style={{ marginTop: 10 }}>
        {PALETTE.map(p => (
          <button
            key={p.c}
            className={'swatch' + (node.color === p.c ? ' sel' : '')}
            style={{ background: p.c }}
            title={p.n}
            onClick={() => engine.updateNode(node.id, { color: p.c })}
          />
        ))}
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <label htmlFor="pulseChk">Pulso</label>
        <input
          id="pulseChk"
          type="checkbox"
          checked={node.pulse}
          onChange={ev => engine.updateNode(node.id, { pulse: ev.target.checked })}
        />
      </div>
      <div className="row">
        <label htmlFor="orderIn">Orden</label>
        <input
          id="orderIn"
          type="number"
          value={node.order}
          onChange={ev => engine.updateNode(node.id, { order: +ev.target.value || 0 })}
        />
      </div>
    </div>
  )
}

function EdgeProperties({ edge }: { edge: Edge }) {
  const engine = useEditorStore(s => s.engine)
  return (
    <div>
      <h3>Flecha</h3>
      <textarea
        id="lblEdit"
        value={edge.label}
        placeholder="Etiqueta"
        onChange={ev => engine.updateEdge(edge.id, { label: ev.target.value })}
      />
      <div className="row" style={{ marginTop: 10 }}>
        <label htmlFor="routeSel">Ruta</label>
        <select
          id="routeSel"
          value={edge.route}
          onChange={ev => engine.updateEdge(edge.id, { route: ev.target.value as Route })}
        >
          <option value="straight">recta</option>
          <option value="ortho">ortogonal</option>
        </select>
      </div>
      <div className="row">
        <label htmlFor="fromSel">Desde</label>
        <select
          id="fromSel"
          value={edge.fromSide ?? ''}
          onChange={ev => engine.updateEdge(edge.id, { fromSide: (ev.target.value || null) as Side | null, waypoints: [] })}
        >
          <option value="">auto</option>
          <option value="n">arriba</option>
          <option value="e">derecha</option>
          <option value="s">abajo</option>
          <option value="w">izquierda</option>
        </select>
      </div>
      <div className="row">
        <label htmlFor="toSel">Hasta</label>
        <select
          id="toSel"
          value={edge.toSide ?? ''}
          onChange={ev => engine.updateEdge(edge.id, { toSide: (ev.target.value || null) as Side | null, waypoints: [] })}
        >
          <option value="">auto</option>
          <option value="n">arriba</option>
          <option value="e">derecha</option>
          <option value="s">abajo</option>
          <option value="w">izquierda</option>
        </select>
      </div>
      <div className="row">
        <label htmlFor="animChk">Animada</label>
        <input id="animChk" type="checkbox" checked={edge.animated} onChange={ev => engine.updateEdge(edge.id, { animated: ev.target.checked })} />
      </div>
      <div className="row">
        <label htmlFor="dashChk">Punteada</label>
        <input id="dashChk" type="checkbox" checked={edge.dashed} onChange={ev => engine.updateEdge(edge.id, { dashed: ev.target.checked })} />
      </div>
      <div className="row">
        <label htmlFor="arrSChk">Punta inicial</label>
        <input id="arrSChk" type="checkbox" checked={edge.startArrow} onChange={ev => engine.updateEdge(edge.id, { startArrow: ev.target.checked })} />
      </div>
      <div className="row">
        <label htmlFor="arrEChk">Punta final</label>
        <input id="arrEChk" type="checkbox" checked={edge.endArrow} onChange={ev => engine.updateEdge(edge.id, { endArrow: ev.target.checked })} />
      </div>
      <div className="row">
        <label htmlFor="flowSel">Flujo</label>
        <select id="flowSel" value={edge.flowDir} onChange={ev => engine.updateEdge(edge.id, { flowDir: ev.target.value as FlowDir })}>
          <option value="normal">normal</option>
          <option value="reverse">inverso</option>
          <option value="alternate">alterno</option>
        </select>
      </div>
      <button className="wfull" onClick={() => engine.updateEdge(edge.id, { waypoints: [] })}>Limpiar codos</button>
    </div>
  )
}

function AnimationSettings() {
  const engine = useEditorStore(s => s.engine)
  const s = engine.state.settings
  return (
    <div>
      <h3>Animación</h3>
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
  )
}

export function PropertiesPanel() {
  const engine = useEditorStore(s => s.engine)
  useEditorStore(s => s.version)
  const single = engine.sel.singleSel()
  const count = engine.sel.selN.size + engine.sel.selE.size

  return (
    <aside>
      {single
        ? single.type === 'node'
          ? <NodeProperties node={single.obj as Node} />
          : <EdgeProperties edge={single.obj as Edge} />
        : count > 1
          ? (
            <div>
              <h3>Selección</h3>
              <p className="hint">{count} elementos seleccionados.</p>
              <button className="wfull danger" onClick={() => engine.sel.deleteSel()}>Eliminar</button>
            </div>
          )
          : <div><h3>Sin selección</h3></div>}
      <AnimationSettings />
    </aside>
  )
}