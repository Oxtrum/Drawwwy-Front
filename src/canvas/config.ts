'use strict'

import type { Point, Side, ThemeColors } from './types'

export const W = 2560
export const H = 1440
export const GRID = 40
export const ARROW_OFF = 24
export const HANDLE = 7

/**
 * Tipografía del lienzo. Debe coincidir con --font-sans / --font-mono de styles/index.css:
 * las etiquetas se dibujan en canvas 2D, que no hereda nada del CSS.
 */
export const FONT_SANS = '"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'
export const FONT_MONO = '"Geist Mono", ui-monospace, "Cascadia Code", Consolas, monospace'
export const FONT_SERIF = '"Georgia", ui-serif, "Times New Roman", serif'

/** Fuente de un nodo/arista en px, lista para asignar a ctx.font. */
export const canvasFont = (px: number, weight = 500, family = FONT_SANS): string =>
  `${weight} ${px}px ${family}`

export interface FontOption {
  label: string
  family: string
}

/** Opciones de tipografía del selector "Fuente" en nodos de texto. */
export const TEXT_FONTS: FontOption[] = [
  { label: 'Sans', family: FONT_SANS },
  { label: 'Mono', family: FONT_MONO },
  { label: 'Serif', family: FONT_SERIF },
]

export interface PaletteEntry {
  c: string
  n: string
}

/**
 * Paleta categórica de los nodos. Anclada en el primario del sistema de diseño
 * (#1763D0) e incorporando sus tres colores de estado; el resto son matices
 * separados en tono para que dos categorías contiguas nunca se confundan,
 * y todos legibles sobre el fondo claro y el oscuro.
 */
export const PALETTE: PaletteEntry[] = [
  { c: '#1763D0', n: 'Servicio' },
  { c: '#0D9488', n: 'Datos' },
  { c: '#7C3AED', n: 'Eventos' },
  { c: '#DB2777', n: 'IA' },
  { c: '#10B981', n: 'Éxito' },
  { c: '#F59E0B', n: 'Cómputo' },
  { c: '#EF4444', n: 'Alerta' },
  { c: '#64748B', n: 'Externo' },
]

/**
 * Paleta genérica ("Todos los colores") para el selector de estilo de figuras
 * y flechas: no tiene significado semántico, a diferencia de PALETTE.
 */
export const EXTRA_COLORS: string[] = [
  '#FFFFFF', '#FDE68A', '#FDBA9C', '#F9A8C9',
  '#86EFAC', '#93C5FD', '#C4B5FD', '#FACC15',
  '#FB923C', '#F87171', '#4ADE80', '#60A5FA',
  '#A78BFA', '#CA8A04', '#92400E', '#B91C1C',
  '#E2E8F0', '#94A3B8', '#475569', '#0F172A',
  '#64748B', '#22D3EE', '#0E7490', '#5EEAD4',
]

/** Primario del sistema de diseño y sus variantes. */
export const BRAND = {
  primary: '#1763D0',
  primaryLight: '#4A8BE8',
  primaryDark: '#0F4491',
} as const

export const THEMES: Record<string, ThemeColors> = {
  dark: {
    light: false,
    bg: '#141414',
    grid: 'rgba(255,255,255,.06)',
    text: '#F2F2F2',
    edge: '#6B6B6B',
    edgeLbl: '#9A9A9A',
    lblBg: '#141414',
    sel: BRAND.primaryLight,
    hint: 'rgba(255,255,255,.4)',
  },
  claro: {
    light: true,
    bg: '#FFFFFF',
    grid: 'rgba(15,23,42,.06)',
    text: '#0F172A',
    edge: '#94A3B8',
    edgeLbl: '#64748B',
    lblBg: '#FFFFFF',
    sel: BRAND.primary,
    hint: 'rgba(100,116,139,.75)',
  },
}

export const DEFAULT_THEME = 'dark'

export const THEME_LABELS: Record<string, string> = {
  dark: 'Oscuro',
  claro: 'Claro',
}

/** Temas retirados en el rediseño; los documentos guardados aún los referencian. */
const THEME_ALIASES: Record<string, string> = { crema: 'claro', light: 'claro' }

/** Resuelve un nombre de tema guardado a uno que exista hoy. */
export function resolveTheme(name: string | undefined): string {
  if (name && THEMES[name]) return name
  if (name && THEME_ALIASES[name]) return THEME_ALIASES[name]
  return DEFAULT_THEME
}

/** Nunca devuelve undefined, aunque el documento traiga un tema desconocido. */
export function themeOf(name: string | undefined): ThemeColors {
  return THEMES[resolveTheme(name)]
}

export const DIR: Record<Side, Point> = {
  n: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  e: { x: 1, y: 0 },
  w: { x: -1, y: 0 },
}

export const SIDES: Side[] = ['n', 'e', 's', 'w']

export const badge = (bg: string, inner: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="2" y="2" width="60" height="60" rx="14" fill="${bg}"/>${inner}</svg>`

export const wheel = (col: string): string => {
  let s = ''
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3 - Math.PI / 2
    const x = 32 + Math.cos(a) * 15
    const y = 32 + Math.sin(a) * 15
    s += `<line x1="32" y1="32" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${col}" stroke-width="3.4"/>`
  }
  return s + `<circle cx="32" cy="32" r="16" fill="none" stroke="${col}" stroke-width="3.6"/><circle cx="32" cy="32" r="5" fill="${col}"/>`
}

export const cylin = (col: string): string =>
  `<path d="M18 20 v22 c0 4 6 7 14 7 s14 -3 14 -7 V20" fill="none" stroke="${col}" stroke-width="3.4"/><ellipse cx="32" cy="20" rx="14" ry="9" fill="none" stroke="${col}" stroke-width="3.4"/>`

export const clock = (col: string): string =>
  `<circle cx="32" cy="32" r="17" fill="none" stroke="${col}" stroke-width="3.4"/><line x1="32" y1="32" x2="32" y2="20" stroke="${col}" stroke-width="3" stroke-linecap="round"/><line x1="32" y1="32" x2="41" y2="36" stroke="${col}" stroke-width="3" stroke-linecap="round"/>`

export const cdn = (col: string): string =>
  `<circle cx="32" cy="32" r="16" fill="none" stroke="${col}" stroke-width="3"/><line x1="16" y1="32" x2="48" y2="32" stroke="${col}" stroke-width="2.6"/><ellipse cx="32" cy="32" rx="7" ry="16" fill="none" stroke="${col}" stroke-width="2.6"/><circle cx="32" cy="14" r="3" fill="${col}"/><circle cx="32" cy="50" r="3" fill="${col}"/>`

/**
 * Glifo dentro de un badge. Los iconos se sirven como data-URI y se pintan con
 * <img>, contexto que no puede descargar fuentes externas: aquí solo valen
 * familias del sistema, nunca Geist.
 */
export const txtG = (t: string, col: string, fs: number = 30): string =>
  `<text x="32" y="33" font-size="${fs}" font-weight="600" font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace" fill="${col}" text-anchor="middle" dominant-baseline="central">${t}</text>`

export const GCP_BLUE = '#4285f4'
export const AWS_BG = '#232f3e'
export const AWS_OR = '#ff9900'
export const AZ_BLUE = '#0078d4'
export const DOCKER_BLUE = '#2496ED'

export interface IconDef {
  g: string
  n: string
  svg: string
}

export const ICONS: Record<string, IconDef> = {
  kafka: {
    g: 'General', n: 'Kafka', svg: badge('#1b1b1b',
      `<circle cx="32" cy="14" r="6" fill="#fff"/><circle cx="32" cy="50" r="6" fill="#fff"/><circle cx="46" cy="23" r="6" fill="#fff"/><circle cx="46" cy="41" r="6" fill="#fff"/><circle cx="28" cy="32" r="7" fill="#fff"/><line x1="32" y1="18" x2="42" y2="24" stroke="#fff" stroke-width="3"/><line x1="42" y1="40" x2="32" y2="46" stroke="#fff" stroke-width="3"/><line x1="30" y1="20" x2="29" y2="26" stroke="#fff" stroke-width="3"/><line x1="29" y1="38" x2="30" y2="44" stroke="#fff" stroke-width="3"/>`),
  },
  k8s: { g: 'General', n: 'K8s', svg: badge('#326ce5', wheel('#fff')) },
  db: { g: 'General', n: 'BD', svg: badge('#3b4252', cylin('#fff')) },
  queue: {
    g: 'General', n: 'Cola', svg: badge('#5b4a72',
      `<rect x="14" y="18" width="24" height="8" rx="3" fill="#fff"/><rect x="14" y="29" width="24" height="8" rx="3" fill="#fff"/><rect x="14" y="40" width="24" height="8" rx="3" fill="#fff"/><path d="M42 28 l10 5 -10 5z" fill="#fff"/>`),
  },
  user: {
    g: 'General', n: 'Usuario', svg: badge('#6b7b8c',
      `<circle cx="32" cy="24" r="9" fill="#fff"/><path d="M15 50 c2-11 8-15 17-15 s15 4 17 15z" fill="#fff"/>`),
  },
  movil: {
    g: 'General', n: 'Móvil', svg: badge('#4a5560',
      `<rect x="22" y="12" width="20" height="40" rx="4" fill="none" stroke="#fff" stroke-width="3.4"/><circle cx="32" cy="45" r="2.4" fill="#fff"/>`),
  },
  web: {
    g: 'General', n: 'Web', svg: badge('#3c6e71',
      `<circle cx="32" cy="32" r="17" fill="none" stroke="#fff" stroke-width="3.2"/><ellipse cx="32" cy="32" rx="8" ry="17" fill="none" stroke="#fff" stroke-width="3"/><line x1="15" y1="32" x2="49" y2="32" stroke="#fff" stroke-width="3"/>`),
  },
  api: { g: 'General', n: 'API', svg: badge('#2f4858', txtG('&lt;/&gt;', '#fff', 22)) },
  lock: {
    g: 'General', n: 'Seguridad', svg: badge('#7a3b3b',
      `<rect x="19" y="29" width="26" height="21" rx="4" fill="#fff"/><path d="M24 29 v-5 a8 8 0 0 1 16 0 v5" fill="none" stroke="#fff" stroke-width="3.6"/>`),
  },
  ai: {
    g: 'General', n: 'IA', svg: badge('#6d5a96',
      `<path d="M32 12 l4.5 13 13 4.5 -13 4.5 -4.5 13 -4.5 -13 -13 -4.5 13 -4.5z" fill="#fff"/><circle cx="48" cy="16" r="3.4" fill="#fff"/>`),
  },
  server: {
    g: 'General', n: 'Servidor', svg: badge('#37474f',
      `<rect x="16" y="14" width="32" height="10" rx="2" fill="none" stroke="#fff" stroke-width="3"/><circle cx="22" cy="19" r="1.8" fill="#fff"/><rect x="16" y="27" width="32" height="10" rx="2" fill="none" stroke="#fff" stroke-width="3"/><circle cx="22" cy="32" r="1.8" fill="#fff"/><rect x="16" y="40" width="32" height="10" rx="2" fill="none" stroke="#fff" stroke-width="3"/><circle cx="22" cy="45" r="1.8" fill="#fff"/>`),
  },
  cache: {
    g: 'General', n: 'Caché', svg: badge('#8a6d3b',
      `<path d="M34 12 L20 34 h10 l-4 18 18-24 h-10z" fill="#fff"/>`),
  },
  lb: {
    g: 'General', n: 'Balanceador', svg: badge('#3f6b4f',
      `<circle cx="32" cy="16" r="5" fill="#fff"/><circle cx="16" cy="46" r="5" fill="#fff"/><circle cx="32" cy="46" r="5" fill="#fff"/><circle cx="48" cy="46" r="5" fill="#fff"/><line x1="32" y1="21" x2="18" y2="42" stroke="#fff" stroke-width="3"/><line x1="32" y1="21" x2="32" y2="41" stroke="#fff" stroke-width="3"/><line x1="32" y1="21" x2="46" y2="42" stroke="#fff" stroke-width="3"/>`),
  },
  firewall: {
    g: 'General', n: 'Firewall', svg: badge('#8a4a2f',
      `<rect x="14" y="14" width="36" height="36" rx="4" fill="none" stroke="#fff" stroke-width="3"/><line x1="14" y1="26" x2="50" y2="26" stroke="#fff" stroke-width="2.4"/><line x1="14" y1="38" x2="50" y2="38" stroke="#fff" stroke-width="2.4"/><line x1="32" y1="14" x2="32" y2="26" stroke="#fff" stroke-width="2.4"/><line x1="23" y1="26" x2="23" y2="38" stroke="#fff" stroke-width="2.4"/><line x1="41" y1="26" x2="41" y2="38" stroke="#fff" stroke-width="2.4"/><line x1="32" y1="38" x2="32" y2="50" stroke="#fff" stroke-width="2.4"/>`),
  },
  mail: {
    g: 'General', n: 'Correo', svg: badge('#3b6ea5',
      `<rect x="12" y="18" width="40" height="28" rx="3" fill="none" stroke="#fff" stroke-width="3.2"/><path d="M13 20 L32 35 L51 20" fill="none" stroke="#fff" stroke-width="3.2"/>`),
  },
  bell: {
    g: 'General', n: 'Notificación', svg: badge('#a06a2c',
      `<path d="M32 13c-6 0-10 5-10 11v6c0 4-2 7-4 9h28c-2-2-4-5-4-9v-6c0-6-4-11-10-11z" fill="#fff"/><path d="M27 43a5 5 0 0 0 10 0" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>`),
  },
  git: {
    g: 'General', n: 'Git', svg: badge('#a8481c',
      `<circle cx="20" cy="16" r="4.5" fill="#fff"/><circle cx="20" cy="48" r="4.5" fill="#fff"/><circle cx="42" cy="32" r="4.5" fill="#fff"/><line x1="20" y1="20.5" x2="20" y2="43.5" stroke="#fff" stroke-width="3"/><path d="M20 24 c0 8 6 8 18 8" fill="none" stroke="#fff" stroke-width="3"/>`),
  },
  search: {
    g: 'General', n: 'Búsqueda', svg: badge('#3b5a6b',
      `<circle cx="27" cy="27" r="12" fill="none" stroke="#fff" stroke-width="3.6"/><line x1="36" y1="36" x2="48" y2="48" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`),
  },
  chat: {
    g: 'General', n: 'Chat', svg: badge('#2f7a63',
      `<path d="M14 16 h36 a4 4 0 0 1 4 4 v18 a4 4 0 0 1 -4 4 H26 l-8 8 v-8 h-4 a4 4 0 0 1 -4-4 V20 a4 4 0 0 1 4-4z" fill="none" stroke="#fff" stroke-width="3.2"/><circle cx="24" cy="29" r="2" fill="#fff"/><circle cx="32" cy="29" r="2" fill="#fff"/><circle cx="40" cy="29" r="2" fill="#fff"/>`),
  },
  cron: { g: 'General', n: 'Programador', svg: badge('#4a5a7a', clock('#fff')) },
  gke: { g: 'GCP', n: 'GKE', svg: badge(GCP_BLUE, wheel('#fff')) },
  cloudsql: { g: 'GCP', n: 'Cloud SQL', svg: badge(GCP_BLUE, cylin('#fff')) },
  pubsub: {
    g: 'GCP', n: 'Pub/Sub', svg: badge(GCP_BLUE,
      `<circle cx="32" cy="16" r="6" fill="#fff"/><circle cx="18" cy="44" r="6" fill="#fff"/><circle cx="46" cy="44" r="6" fill="#fff"/><circle cx="32" cy="33" r="4.4" fill="#fff"/><line x1="32" y1="21" x2="32" y2="29" stroke="#fff" stroke-width="3"/><line x1="28" y1="36" x2="22" y2="40" stroke="#fff" stroke-width="3"/><line x1="36" y1="36" x2="42" y2="40" stroke="#fff" stroke-width="3"/>`),
  },
  bigquery: {
    g: 'GCP', n: 'BigQuery', svg: badge(GCP_BLUE,
      `<circle cx="29" cy="29" r="13" fill="none" stroke="#fff" stroke-width="3.6"/><line x1="38" y1="38" x2="49" y2="49" stroke="#fff" stroke-width="5" stroke-linecap="round"/><line x1="24" y1="31" x2="24" y2="34" stroke="#fff" stroke-width="3"/><line x1="29" y1="26" x2="29" y2="34" stroke="#fff" stroke-width="3"/><line x1="34" y1="29" x2="34" y2="34" stroke="#fff" stroke-width="3"/>`),
  },
  run: {
    g: 'GCP', n: 'Cloud Run', svg: badge(GCP_BLUE,
      `<circle cx="32" cy="32" r="17" fill="none" stroke="#fff" stroke-width="3.4"/><path d="M27 24 l13 8 -13 8z" fill="#fff"/>`),
  },
  gcs: {
    g: 'GCP', n: 'Storage', svg: badge(GCP_BLUE,
      `<rect x="16" y="20" width="32" height="10" rx="3" fill="#fff"/><rect x="16" y="34" width="32" height="10" rx="3" fill="#fff"/><circle cx="42" cy="25" r="2.2" fill="${GCP_BLUE}"/><circle cx="42" cy="39" r="2.2" fill="${GCP_BLUE}"/>`),
  },
  vertex: {
    g: 'GCP', n: 'Vertex AI', svg: badge(GCP_BLUE,
      `<circle cx="20" cy="20" r="4" fill="#fff"/><circle cx="44" cy="20" r="4" fill="#fff"/><circle cx="32" cy="30" r="4" fill="#fff"/><circle cx="32" cy="46" r="5" fill="#fff"/><line x1="22" y1="23" x2="30" y2="28" stroke="#fff" stroke-width="2.6"/><line x1="42" y1="23" x2="34" y2="28" stroke="#fff" stroke-width="2.6"/><line x1="32" y1="34" x2="32" y2="41" stroke="#fff" stroke-width="2.6"/>`),
  },
  gcf: { g: 'GCP', n: 'Functions', svg: badge(GCP_BLUE, txtG('ƒ', '#fff', 34)) },
  firestore: { g: 'GCP', n: 'Firestore', svg: badge(GCP_BLUE, cylin('#fff')) },
  gcpcdn: { g: 'GCP', n: 'Cloud CDN', svg: badge(GCP_BLUE, cdn('#fff')) },
  gcpsched: { g: 'GCP', n: 'Cloud Scheduler', svg: badge(GCP_BLUE, clock('#fff')) },
  lambda: { g: 'AWS', n: 'Lambda', svg: badge(AWS_BG, txtG('λ', AWS_OR, 34)) },
  s3: {
    g: 'AWS', n: 'S3', svg: badge(AWS_BG,
      `<path d="M18 18 h28 l-4 30 q-10 5 -20 0z" fill="none" stroke="${AWS_OR}" stroke-width="3.4"/><ellipse cx="32" cy="18" rx="14" ry="5.4" fill="none" stroke="${AWS_OR}" stroke-width="3.4"/>`),
  },
  ec2: {
    g: 'AWS', n: 'EC2', svg: badge(AWS_BG,
      `<rect x="20" y="20" width="24" height="24" rx="3" fill="none" stroke="${AWS_OR}" stroke-width="3.4"/>` +
      ['26', '32', '38'].map(p =>
        `<line x1="${p}" y1="13" x2="${p}" y2="20" stroke="${AWS_OR}" stroke-width="3"/><line x1="${p}" y1="44" x2="${p}" y2="51" stroke="${AWS_OR}" stroke-width="3"/><line x1="13" y1="${p}" x2="20" y2="${p}" stroke="${AWS_OR}" stroke-width="3"/><line x1="44" y1="${p}" x2="51" y2="${p}" stroke="${AWS_OR}" stroke-width="3"/>`,
      ).join('')),
  },
  dynamo: { g: 'AWS', n: 'DynamoDB', svg: badge(AWS_BG, cylin(AWS_OR)) },
  sqs: {
    g: 'AWS', n: 'SQS', svg: badge(AWS_BG,
      `<path d="M14 24 h26 m0 0 l-7 -6 m7 6 l-7 6" fill="none" stroke="${AWS_OR}" stroke-width="3.4"/><path d="M50 42 h-26 m0 0 l7 -6 m-7 6 l7 6" fill="none" stroke="${AWS_OR}" stroke-width="3.4"/>`),
  },
  apigw: { g: 'AWS', n: 'API GW', svg: badge(AWS_BG, txtG('&lt;/&gt;', AWS_OR, 21)) },
  rds: { g: 'AWS', n: 'RDS', svg: badge(AWS_BG, cylin(AWS_OR)) },
  cloudfront: { g: 'AWS', n: 'CloudFront', svg: badge(AWS_BG, cdn(AWS_OR)) },
  iam: {
    g: 'AWS', n: 'IAM', svg: badge(AWS_BG,
      `<circle cx="24" cy="24" r="9" fill="none" stroke="${AWS_OR}" stroke-width="3.4"/><line x1="30" y1="30" x2="48" y2="48" stroke="${AWS_OR}" stroke-width="3.4"/><line x1="40" y1="38" x2="46" y2="32" stroke="${AWS_OR}" stroke-width="3.4"/><line x1="44" y1="42" x2="50" y2="36" stroke="${AWS_OR}" stroke-width="3.4"/>`),
  },
  azvm: {
    g: 'Azure', n: 'VM', svg: badge(AZ_BLUE,
      `<rect x="16" y="17" width="32" height="22" rx="3" fill="none" stroke="#fff" stroke-width="3.4"/><line x1="24" y1="48" x2="40" y2="48" stroke="#fff" stroke-width="3.4"/><line x1="32" y1="39" x2="32" y2="48" stroke="#fff" stroke-width="3.4"/>`),
  },
  azfun: {
    g: 'Azure', n: 'Functions', svg: badge(AZ_BLUE,
      `<path d="M36 12 L22 35 h9 l-4 17 16 -25 h-9z" fill="#ffd400"/>`),
  },
  cosmos: {
    g: 'Azure', n: 'Cosmos DB', svg: badge(AZ_BLUE,
      `<circle cx="32" cy="32" r="12" fill="none" stroke="#fff" stroke-width="3.4"/><ellipse cx="32" cy="32" rx="22" ry="8" fill="none" stroke="#fff" stroke-width="2.6" transform="rotate(-20 32 32)"/>`),
  },
  azbus: {
    g: 'Azure', n: 'Service Bus', svg: badge(AZ_BLUE,
      `<rect x="14" y="26" width="36" height="12" rx="4" fill="#fff"/><circle cx="22" cy="32" r="2.6" fill="${AZ_BLUE}"/><circle cx="32" cy="32" r="2.6" fill="${AZ_BLUE}"/><circle cx="42" cy="32" r="2.6" fill="${AZ_BLUE}"/>`),
  },
  aks: {
    g: 'Azure', n: 'AKS', svg: badge(AZ_BLUE,
      `<path d="M32 12 l17 10 v20 l-17 10 -17 -10 V22z" fill="none" stroke="#fff" stroke-width="3.4"/><circle cx="32" cy="32" r="6" fill="#fff"/>`),
  },
  azsql: { g: 'Azure', n: 'Azure SQL', svg: badge(AZ_BLUE, cylin('#fff')) },
  azmonitor: {
    g: 'Azure', n: 'Monitor', svg: badge(AZ_BLUE,
      `<path d="M14 46 L14 14" stroke="#fff" stroke-width="3" fill="none"/><path d="M14 46 L50 46" stroke="#fff" stroke-width="3" fill="none"/><path d="M18 40 L26 28 L34 34 L46 18" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`),
  },
  docker: {
    g: 'Docker', n: 'Docker', svg: badge(DOCKER_BLUE,
      `<rect x="13" y="26" width="9" height="9" rx="1.5" fill="#fff"/><rect x="23" y="26" width="9" height="9" rx="1.5" fill="#fff"/><rect x="33" y="26" width="9" height="9" rx="1.5" fill="#fff"/><rect x="23" y="15" width="9" height="9" rx="1.5" fill="#fff"/><path d="M8 36 h44 c2 0 2 6-3 6H16c-3 4-8 5-11 3-1-3 0-6 1-9z" fill="#fff"/>`),
  },
  compose: {
    g: 'Docker', n: 'Docker Compose', svg: badge(DOCKER_BLUE,
      `<rect x="12" y="14" width="26" height="18" rx="3" fill="none" stroke="#fff" stroke-width="3"/><rect x="26" y="32" width="26" height="18" rx="3" fill="none" stroke="#fff" stroke-width="3"/><path d="M25 23 h8" stroke="#fff" stroke-width="3"/><path d="M39 41 h8" stroke="#fff" stroke-width="3"/>`),
  },
  container: {
    g: 'Docker', n: 'Contenedor', svg: badge(DOCKER_BLUE,
      `<rect x="12" y="16" width="40" height="32" rx="2" fill="none" stroke="#fff" stroke-width="3.2"/><line x1="20" y1="16" x2="20" y2="48" stroke="#fff" stroke-width="2.6"/><line x1="28" y1="16" x2="28" y2="48" stroke="#fff" stroke-width="2.6"/><line x1="36" y1="16" x2="36" y2="48" stroke="#fff" stroke-width="2.6"/><line x1="44" y1="16" x2="44" y2="48" stroke="#fff" stroke-width="2.6"/>`),
  },
  dockervol: {
    g: 'Docker', n: 'Volumen', svg: badge(DOCKER_BLUE,
      `<rect x="16" y="14" width="32" height="36" rx="4" fill="none" stroke="#fff" stroke-width="3.2"/><circle cx="32" cy="24" r="4" fill="none" stroke="#fff" stroke-width="2.6"/><line x1="22" y1="38" x2="42" y2="38" stroke="#fff" stroke-width="2.6"/><line x1="22" y1="44" x2="42" y2="44" stroke="#fff" stroke-width="2.6"/>`),
  },
  dockernet: {
    g: 'Docker', n: 'Red', svg: badge(DOCKER_BLUE,
      `<circle cx="32" cy="16" r="5" fill="#fff"/><circle cx="16" cy="46" r="5" fill="#fff"/><circle cx="48" cy="46" r="5" fill="#fff"/><path d="M32 21 v10 M32 31 l-13 12 M32 31 l13 12" fill="none" stroke="#fff" stroke-width="3"/><rect x="24" y="27" width="16" height="8" rx="2" fill="none" stroke="#fff" stroke-width="2.6"/>`),
  },
  registry: {
    g: 'Docker', n: 'Registro', svg: badge(DOCKER_BLUE,
      `<path d="M14 22 L32 12 L50 22 V46 L32 56 L14 46 Z" fill="none" stroke="#fff" stroke-width="3"/><path d="M14 22 L32 32 L50 22 M32 32 V56" fill="none" stroke="#fff" stroke-width="2.6"/>`),
  },
}

/** El fondo de cada ícono es siempre este mismo `<rect>` (ver `badge()`), solo
 *  cambia el color. Se usa para separar fondo de glifo: el fondo se redibuja
 *  en el canvas con el color propio del nodo (personalizable); el glifo se
 *  sirve sin fondo y se dibuja encima. */
const BADGE_RECT_RE = /<rect x="2" y="2" width="60" height="60" rx="14" fill="([^"]*)"\/>/

/** Color de fondo original de cada ícono (el de su badge de marca), usado como
 *  color por defecto al colocar el nodo por primera vez. */
export const iconBg: Record<string, string> = {}
export const iconURL: Record<string, string> = {}
export const iconGlyphURL: Record<string, string> = {}
export const imgCache: Record<string, HTMLImageElement> = {}

for (const k in ICONS) {
  const svg = ICONS[k].svg
  iconBg[k] = svg.match(BADGE_RECT_RE)?.[1] || '#64748B'
  iconURL[k] = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
  iconGlyphURL[k] = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg.replace(BADGE_RECT_RE, ''))
}

export function getImg(src: string): HTMLImageElement {
  if (!imgCache[src]) {
    const im = new Image()
    im.src = src
    imgCache[src] = im
  }
  return imgCache[src]
}
