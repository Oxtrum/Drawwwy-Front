import { CanvasStage } from '../../components/canvas/canvas-stage'
import { EditorHeader } from '../../components/layout/header'
import { PagesBar } from '../../components/layout/pages-bar'
import { PropertiesPanel } from '../../components/layout/properties-panel'
import { ToolRail } from '../../components/layout/tool-rail'
import { IconDrawer } from '../../components/ui/icon-drawer'

export function EditorPage() {
  return (
    <>
      <EditorHeader />
      <main>
        <ToolRail />
        <CanvasStage />
        <IconDrawer />
        <PropertiesPanel />
      </main>
      <PagesBar />
    </>
  )
}
