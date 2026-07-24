'use strict'

export type Shape = 'rect' | 'cylinder' | 'diamond' | 'circle' | 'hex' | 'text' | 'icon' | 'image'
export type Side = 'n' | 'e' | 's' | 'w'
export type Route = 'straight' | 'ortho'
export type FlowDir = 'normal' | 'reverse' | 'alternate'

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
  dashed: boolean
  startArrow: boolean
  endArrow: boolean
  flowDir: FlowDir
  lineColor?: string | null
  dotColor?: string | null
  fs?: number | null
}

export interface Page {
  name: string
  nodes: Node[]
  edges: Edge[]
  nextId: number
}

export interface Document {
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

export interface SingleSelection {
  type: 'node' | 'edge'
  obj: Node | Edge
}

export interface ThemeColors {
  bg: string
  grid: string
  text: string
  edge: string
  edgeLbl: string
  lblBg: string
}
