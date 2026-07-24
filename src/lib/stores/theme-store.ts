import { create } from 'zustand'
import { engine } from './editor-store'

export type AppTheme = 'dark' | 'claro'

/**
 * Tema único de toda la app: chrome (dashboard, header, rail) y lienzo
 * (fondo, cuadrícula, colores de arista) comparten el mismo valor. Se
 * propaga a mano a `engine.setTheme` porque el lienzo se pinta en canvas 2D,
 * que no puede leer variables CSS ni el atributo data-theme.
 */
const KEY = 'drawwwy.app-theme'

function readInitial(): AppTheme {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'dark' || v === 'claro') return v
  } catch {
    /* noop */
  }
  return 'dark'
}

function apply(theme: AppTheme): void {
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme === 'claro' ? 'light' : 'dark'
  engine.setTheme(theme)
}

interface ThemeStore {
  theme: AppTheme
  setTheme: (theme: AppTheme) => void
  toggle: () => void
}

const initialTheme = readInitial()
apply(initialTheme)

export const useThemeStore = create<ThemeStore>(set => ({
  theme: initialTheme,
  setTheme: theme => {
    apply(theme)
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      /* noop */
    }
    set({ theme })
  },
  toggle: () =>
    set(s => {
      const next: AppTheme = s.theme === 'dark' ? 'claro' : 'dark'
      apply(next)
      try {
        localStorage.setItem(KEY, next)
      } catch {
        /* noop */
      }
      return { theme: next }
    }),
}))
