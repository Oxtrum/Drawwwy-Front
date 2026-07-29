import { DEFAULT_THEME, resolveTheme } from '../../canvas/config'
import type { ProjectFile } from '../../canvas/state'

export function createBlankProjectFile(name = 'Sin titulo', theme = DEFAULT_THEME): ProjectFile {
  return {
    version: 3,
    app: 'drawwwy',
    doc: {
      name,
      theme: resolveTheme(theme),
      pages: [{ name: 'Pagina 1', nodes: [], edges: [], nextId: 1 }],
      cur: 0,
    },
    settings: {
      speed: 0.5,
      dots: 3,
      build: false,
      stagger: 0.45,
      grid: true,
    },
  }
}
