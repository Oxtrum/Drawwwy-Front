import { ICONS, iconURL } from '../../canvas/config'
import { useEditorStore } from '../../lib/stores/editor-store'

const GROUPS = ['General', 'GCP', 'AWS', 'Azure']

export function IconDrawer() {
  const engine = useEditorStore(s => s.engine)
  const open = useEditorStore(s => s.iconDrawerOpen)
  const toggleIconDrawer = useEditorStore(s => s.toggleIconDrawer)
  useEditorStore(s => s.version)

  if (!open) return null

  return (
    <div id="iconDrawer" style={{ display: 'block' }}>
      {GROUPS.map(g => {
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
                    toggleIconDrawer(false)
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