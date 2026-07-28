import { useEffect, useRef, useState } from 'react'
import { useEditorStore } from '../../lib/stores/editor-store'

export function EditOverlay() {
  const engine = useEditorStore(s => s.engine)
  const box = useEditorStore(s => s.editBox)
  const ref = useRef<HTMLTextAreaElement>(null)
  const [value, setValue] = useState('')

  useEffect(() => {
    if (!box) return
    setValue(box.value)
    const el = ref.current
    if (el) {
      el.focus()
      el.select()
    }
  }, [box])

  if (!box) return null

  return (
    <textarea
      ref={ref}
      id="editBox"
      value={value}
      rows={value.split('\n').length || 1}
      style={{
        display: 'block',
        left: box.left,
        top: box.top,
        width: box.width,
        fontSize: box.fontSize,
        fontWeight: box.bold ? 700 : undefined,
        fontFamily: box.font,
        textAlign: box.align,
      }}
      onChange={ev => {
        setValue(ev.target.value)
        engine.setEditValue(ev.target.value)
      }}
      onKeyDown={ev => {
        if (ev.key === 'Enter' && !ev.shiftKey) {
          ev.preventDefault()
          engine.commitEdit()
        }
        if (ev.key === 'Escape') engine.cancelEdit()
        ev.stopPropagation()
      }}
      onBlur={() => engine.commitEdit()}
    />
  )
}