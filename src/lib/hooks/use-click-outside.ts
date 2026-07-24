import { useEffect } from 'react'
import type { RefObject } from 'react'

/** Cierra menús/popovers flotantes: dropdown de tarjeta, futuros combos, etc. */
export function useClickOutside(ref: RefObject<HTMLElement | null>, onOutside: () => void, active: boolean): void {
  useEffect(() => {
    if (!active) return
    const handler = (ev: PointerEvent): void => {
      if (ref.current && !ref.current.contains(ev.target as Node)) onOutside()
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [ref, onOutside, active])
}
