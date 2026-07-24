import { useThemeStore } from '../../lib/stores/theme-store'

/** Alterna el tema del chrome de la app (dashboard + header + paneles). No afecta doc.theme. */
export function ThemeToggle() {
  const theme = useThemeStore(s => s.theme)
  const toggle = useThemeStore(s => s.toggle)
  const isDark = theme === 'dark'
  const label = isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'

  return (
    <button type="button" className="icon-btn" title={label} aria-label={label} onClick={toggle}>
      {isDark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3 7.2 7.2 0 0 0 21 12.8Z" />
        </svg>
      )}
    </button>
  )
}
