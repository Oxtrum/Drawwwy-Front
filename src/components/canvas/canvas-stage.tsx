import { useEffect, useRef } from 'react'
import { useEditorStore } from '../../stores/editor-store'
import { EditOverlay } from './edit-overlay'

export function CanvasStage() {
  const engine = useEditorStore(s => s.engine)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cv = canvasRef.current
    const wrap = wrapRef.current
    if (!cv || !wrap) return
    engine.mount(cv, wrap)
    return () => engine.unmount()
  }, [engine])

  return (
    <div className="stage">
      <div id="wrap" ref={wrapRef}>
        <canvas id="cv" ref={canvasRef} />
        <EditOverlay />
      </div>
    </div>
  )
}
