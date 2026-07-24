import { CanvasStage } from '../../components/editor/canvas-stage'
import { EditorHeader } from '../../components/editor/header'
import { PagesBar } from '../../components/editor/pages-bar'
import { PropertiesPanel } from '../../components/editor/properties-panel'
import { ToolRail } from '../../components/editor/tool-rail'
import { ShapesPanel } from '../../components/editor/shapes-panel'
import { IconDrawer } from '../../components/ui/icon-drawer'

export function EditorPage() {
  return (
    <div className="editor-shell">
      <EditorHeader />
      <main>
        <ToolRail />
        <ShapesPanel />
        <CanvasStage />
        <IconDrawer />
        <PropertiesPanel />
      </main>
      <PagesBar />
    </div>
  )
}
