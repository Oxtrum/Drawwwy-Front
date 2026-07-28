import { CanvasStage } from '../../components/editor/canvas-stage'
import { EditorHeader } from '../../components/editor/header'
import { PagesBar } from '../../components/editor/pages-bar'
import { ToolRail } from '../../components/editor/tool-rail'
import { ShapesPanel } from '../../components/editor/shapes-panel'
import { MoreShapesPanel } from '../../components/ui/more-shapes-panel'
import { AnimationModal } from '../../components/editor/animation-modal'

export function EditorPage() {
  return (
    <div className="editor-shell">
      <EditorHeader />
      <main>
        <ToolRail />
        <ShapesPanel />
        <CanvasStage />
        <MoreShapesPanel />
      </main>
      <PagesBar />
      <AnimationModal />
    </div>
  )
}
