'use strict'

export type Shape = 'rect' | 'cylinder' | 'diamond' | 'circle' | 'hex' | 'text' | 'icon' | 'image'
export type Side = 'n' | 'e' | 's' | 'w'
export type Route = 'straight' | 'ortho'
export type FlowDir = 'normal' | 'reverse' | 'alternate'
export type LineStyle = 'solid' | 'dashed' | 'dotted'
export type DotShape = 'circle' | 'triangle' | 'diamond' | 'json' | 'package' | 'mail'

export interface Point {
  x: number
  y: number
}

export interface PointAng extends Point {
  ang: number
}

export interface Waypoint {
  x: number
  y: number
}

export interface Node {
  id: number
  shape: Shape
  x: number
  y: number
  w: number
  h: number
  label: string
  color: string
  pulse: boolean
  order: number
  icon?: string
  img?: string
  fs?: number | null
  /** Color de borde: usa `color`. Relleno independiente; sin valor cae a `color`. */
  fill?: string | null
  fillOpacity?: number
  borderWidth?: number
  lineStyle?: LineStyle
  opacity?: number
  /** Solo aplica a `shape: 'image'`: las demás figuras siempre muestran su
   *  borde (`color`/`borderWidth`/`lineStyle`); una imagen no, salvo que se
   *  active acá, para no dibujar un borde por defecto sobre fotos existentes. */
  imgBorder?: boolean
  /** Brillo del pulso (`pulse: true`): sin valor, cae a `color` / velocidad
   *  global de animación / 18px de blur. */
  pulseColor?: string
  pulseSpeed?: number
  pulseSize?: number
  /** Solo aplican a `shape: 'text'`. Sin valor: peso normal, fuente sans del
   *  sistema (`FONT_SANS`), alineado al centro. */
  bold?: boolean
  font?: string
  align?: 'left' | 'center' | 'right'
}

export interface Edge {
  id: number
  from: number
  to: number
  fromSide: Side | null
  toSide: Side | null
  route: Route
  waypoints: Waypoint[]
  label: string
  animated: boolean
  lineStyle: LineStyle
  startArrow: boolean
  endArrow: boolean
  flowDir: FlowDir
  lineColor?: string | null
  dotColor?: string | null
  dotShape?: DotShape
  dotSize?: number
  dotSpeed?: number
  lineWidth?: number
  fs?: number | null
}

export interface Page {
  name: string
  nodes: Node[]
  edges: Edge[]
  nextId: number
}

export interface Document {
  name: string
  theme: string
  pages: Page[]
  cur: number
}

export interface Settings {
  speed: number
  dots: number
  build: boolean
  stagger: number
  grid: boolean
}

export interface Bounds {
  x: number
  y: number
  w: number
  h: number
}

export interface DragState {
  offs: Record<number, { dx: number; dy: number }>
  wps: Array<{ w: Waypoint; dx: number; dy: number }>
}

export interface PlacementState {
  shape: Shape | null
  icon: string | null
  start: Point
  current: Point
}

export interface ResizeState {
  id: number
  fx: number
  fy: number
  aspect: number | null
}

export interface MarqueeState {
  x0: number
  y0: number
  x1: number
  y1: number
  add: boolean
}

export interface ConnectDragState {
  fromId: number
  fromSide: Side
}

export type SingleSelection =
  | { type: 'node'; obj: Node }
  | { type: 'edge'; obj: Edge }

export interface ThemeColors {
  /** true en modos claros: invierte los contrastes de los adornos del canvas. */
  light: boolean
  bg: string
  grid: string
  text: string
  edge: string
  edgeLbl: string
  lblBg: string
  /** Color de las affordances de edición (selección, anclas, marquee, waypoints). */
  sel: string
  /** Texto del placeholder del lienzo vacío. */
  hint: string
}
