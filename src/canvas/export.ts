import { getImg, iconURL, themeOf } from './config'
import { edgePoints } from './geometry'
import { render } from './render'
import type { CanvasEngine } from './engine'
import type { Bounds, Page } from './types'

export interface RasterExportOptions {
  scale?: number
  margin?: number
  background?: string
  quality?: number
}

export interface PdfExportOptions extends RasterExportOptions {
  filename?: string
}

function pageAt(eng: CanvasEngine, pageIndex: number): Page {
  const page = eng.state.doc.pages[pageIndex]
  if (!page) throw new Error('La pagina solicitada no existe')
  return page
}

function imageSources(eng: CanvasEngine, pageIndex: number): string[] {
  const sources: string[] = []
  for (const node of pageAt(eng, pageIndex).nodes) {
    if (node.shape === 'image' && node.img) sources.push(node.img)
    if (node.shape === 'icon' && node.icon && iconURL[node.icon]) sources.push(iconURL[node.icon])
  }
  return [...new Set(sources)]
}

function waitForImage(src: string): Promise<boolean> {
  const image = getImg(src)
  if (image.complete) return Promise.resolve(image.naturalWidth > 0)
  return new Promise(resolve => {
    const done = (loaded: boolean): void => {
      image.removeEventListener('load', onLoad)
      image.removeEventListener('error', onError)
      resolve(loaded)
    }
    const onLoad = (): void => done(true)
    const onError = (): void => done(false)
    image.addEventListener('load', onLoad, { once: true })
    image.addEventListener('error', onError, { once: true })
  })
}

async function waitForImages(eng: CanvasEngine, pageIndex: number): Promise<void> {
  await Promise.all(imageSources(eng, pageIndex).map(waitForImage))
}

function pageBounds(eng: CanvasEngine, pageIndex: number): Bounds {
  const page = pageAt(eng, pageIndex)
  if (page.nodes.length === 0) return { x: 0, y: 0, w: 1280, h: 720 }
  let mx = Infinity
  let my = Infinity
  let Mx = -Infinity
  let My = -Infinity
  const addP = (x: number, y: number): void => {
    if (x < mx) mx = x
    if (x > Mx) Mx = x
    if (y < my) my = y
    if (y > My) My = y
  }
  const nodes = new Map(page.nodes.map(node => [node.id, node]))
  page.nodes.forEach(node => {
    addP(node.x - node.w / 2, node.y - node.h / 2)
    addP(node.x + node.w / 2, node.y + node.h / 2)
  })
  page.edges.forEach(edge => {
    edgePoints(edge, id => nodes.get(id)).forEach(point => addP(point.x, point.y))
  })
  mx -= 40
  my -= 40
  Mx += 40
  My += 40
  return { x: mx, y: my, w: Mx - mx, h: My - my }
}

export async function renderPageToCanvas(
  eng: CanvasEngine,
  pageIndex: number,
  options: RasterExportOptions = {},
): Promise<HTMLCanvasElement> {
  await waitForImages(eng, pageIndex)
  const bounds = pageBounds(eng, pageIndex)
  const scale = Math.max(0.25, Math.min(options.scale ?? 1, 4))
  const margin = Math.max(0, options.margin ?? 40)
  const width = Math.max(1, Math.ceil((bounds.w + margin * 2) * scale))
  const height = Math.max(1, Math.ceil((bounds.h + margin * 2) * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo crear el contexto de exportación')

  const theme = themeOf(eng.state.doc.theme)
  const originalPage = eng.state.doc.cur
  ctx.save()
  ctx.scale(scale, scale)
  ctx.translate(-bounds.x + margin, -bounds.y + margin)
  try {
    eng.state.doc.cur = pageIndex
    render(ctx, eng.now(), eng, {
      export: true,
      bounds,
      bg: options.background ?? theme.bg,
    })
  } finally {
    eng.state.doc.cur = originalPage
    ctx.restore()
  }
  return canvas
}

export async function renderCurrentPageToCanvas(
  eng: CanvasEngine,
  options: RasterExportOptions = {},
): Promise<HTMLCanvasElement> {
  return renderPageToCanvas(eng, eng.state.doc.cur, options)
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob)
      else reject(new Error('No se pudo generar la imagen'))
    }, type, quality)
  })
}

export async function exportCurrentPageAsJpg(
  eng: CanvasEngine,
  options: RasterExportOptions = {},
): Promise<Blob> {
  const canvas = await renderCurrentPageToCanvas(eng, options)
  return canvasToBlob(canvas, 'image/jpeg', options.quality ?? 0.92)
}

export async function exportDocumentAsPdf(
  eng: CanvasEngine,
  options: PdfExportOptions = {},
): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const pages = eng.state.doc.pages
  if (pages.length === 0) throw new Error('No hay paginas para exportar')

  let pdf: InstanceType<typeof jsPDF> | null = null
  const pdfMargin = 24
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const canvas = await renderPageToCanvas(eng, pageIndex, {
      ...options,
      scale: options.scale ?? 2,
      background: options.background,
      quality: options.quality,
    })
    const orientation = canvas.width >= canvas.height ? 'landscape' : 'portrait'
    if (!pdf) {
      pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4' })
    } else {
      pdf.addPage('a4', orientation)
    }

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const maxWidth = pageWidth - pdfMargin * 2
    const maxHeight = pageHeight - pdfMargin * 2
    const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height)
    const imageWidth = canvas.width * ratio
    const imageHeight = canvas.height * ratio
    const x = (pageWidth - imageWidth) / 2
    const y = (pageHeight - imageHeight) / 2
    pdf.addImage(canvas.toDataURL('image/jpeg', options.quality ?? 0.92), 'JPEG', x, y, imageWidth, imageHeight)
  }

  if (!pdf) throw new Error('No se pudo generar el PDF')
  return pdf.output('blob')
}
