import { useEffect, type RefObject } from 'react'

export function useClickOutside(ref: RefObject<HTMLElement | null>, onOutside: () => void): void {
  useEffect(() => {
    const handler = (ev: PointerEvent): void => {
      if (ref.current && !ref.current.contains(ev.target as globalThis.Node)) onOutside()
    }
    document.addEventListener('pointerdown', handler, true)
    return () => document.removeEventListener('pointerdown', handler, true)
  }, [ref, onOutside])
}
