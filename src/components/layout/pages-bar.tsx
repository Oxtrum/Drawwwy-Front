import { useEditorStore } from '../../stores/editor-store'

export function PagesBar() {
  const engine = useEditorStore(s => s.engine)
  useEditorStore(s => s.version)
  const doc = engine.state.doc

  return (
    <footer>
      {doc.pages.map((pg, i) => (
        <div
          key={i}
          className={'tab' + (i === doc.cur ? ' active' : '')}
          onClick={() => engine.gotoPage(i)}
          onDoubleClick={() => {
            const nn = prompt('Nombre de la página:', pg.name)
            if (nn) engine.renamePage(i, nn)
          }}
        >
          {pg.name}
          {doc.pages.length > 1 && (
            <span
              className="x"
              onClick={ev => { ev.stopPropagation(); engine.removePage(i) }}
            >
              ×
            </span>
          )}
        </div>
      ))}
      <button onClick={() => engine.addPage()}>+ Página</button>
    </footer>
  )
}
