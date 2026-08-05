/**
 * Miniatura de reserva para tableros que aún no tienen thumbnail.
 *
 * Antes la vista previa repetía el nombre del tablero, que ya aparece justo
 * debajo en la ficha. En su lugar dibuja un diagrama esquemático; el reparto
 * se elige con un hash del id para que dos tarjetas contiguas no salgan
 * idénticas, y es estable entre recargas (mismo id → mismo dibujo).
 */
const LAYOUTS = [
  // Cadena horizontal
  <g key="a">
    <path d="M74 40h22M134 40h22" />
    <rect x="18" y="26" width="56" height="28" rx="6" />
    <rect x="96" y="26" width="38" height="28" rx="6" />
    <rect x="156" y="26" width="46" height="28" rx="6" />
  </g>,
  // Fan-out
  <g key="b">
    <path d="M76 40h20v-16h30M96 40h30M76 40h20v16h30" />
    <rect x="20" y="26" width="56" height="28" rx="6" />
    <rect x="126" y="10" width="46" height="24" rx="6" />
    <rect x="126" y="46" width="46" height="24" rx="6" />
  </g>,
  // Ciclo
  <g key="c">
    <path d="M70 26h44M114 54H70M62 34v12M122 34v12" />
    <rect x="26" y="12" width="44" height="22" rx="6" />
    <rect x="114" y="12" width="44" height="22" rx="6" />
    <rect x="26" y="46" width="44" height="22" rx="6" />
    <rect x="114" y="46" width="44" height="22" rx="6" />
  </g>,
]

function pick(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return Math.abs(h) % LAYOUTS.length
}

export function BoardPlaceholder({ seed }: { seed: string }) {
  return (
    <svg className="board-placeholder" viewBox="0 0 220 80" aria-hidden="true">
      {LAYOUTS[pick(seed)]}
    </svg>
  )
}
