/**
 * Ilustración del panel comercial de /login.
 *
 * Es SVG inline y no un PNG en public/ por tres razones: pesa ~4 KB y no añade
 * una petición al primer render de la pantalla de entrada; escala nítido en
 * cualquier densidad; y el "flujo" de las aristas se anima con CSS
 * (`.auth-art-flow`), que es justo lo que vende el producto — diagramas
 * animados. Los colores son literales de la paleta de marca en vez de tokens
 * de tema porque el panel izquierdo es siempre la superficie azul oscura, en
 * claro y en oscuro.
 */
export function AuthArtwork() {
  return (
    <svg
      className="auth-art"
      viewBox="0 0 520 368"
      role="img"
      aria-label="Diagrama animado de ejemplo hecho en Drawwwy"
    >
      <defs>
        <linearGradient id="aaNode" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#20375F" />
          <stop offset="100%" stopColor="#182B4C" />
        </linearGradient>
        <linearGradient id="aaNodeSel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1763D0" />
          <stop offset="100%" stopColor="#0F4491" />
        </linearGradient>
        <pattern id="aaGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="1" />
        </pattern>
      </defs>

      {/* Lienzo */}
      <rect x="14" y="26" width="492" height="330" rx="18" fill="rgba(9,17,33,.55)" />
      <rect x="14" y="26" width="492" height="330" rx="18" fill="url(#aaGrid)" />
      <rect
        x="14.5" y="26.5" width="491" height="329" rx="17.5"
        fill="none" stroke="rgba(255,255,255,.14)"
      />

      {/* Pill de herramientas, guiño al chrome del editor */}
      <g>
        <rect x="196" y="8" width="128" height="34" rx="17" fill="#16233D" stroke="rgba(255,255,255,.16)" />
        <g fill="rgba(255,255,255,.55)">
          <rect x="212" y="20" width="12" height="10" rx="2" />
          <circle cx="248" cy="25" r="5.5" />
          <path d="M270 30l12-12" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="2" strokeLinecap="round" />
          <rect x="296" y="19" width="12" height="12" rx="6" fill="#4A8BE8" />
        </g>
      </g>

      {/* Aristas con flujo animado */}
      <g fill="none" stroke="#4A8BE8" strokeWidth="2" strokeLinecap="round">
        <g stroke="rgba(74,139,232,.30)">
          <path d="M176 132H203V108H236" />
          <path d="M176 132H203V252H236" />
          <path d="M356 108H379V174H400" />
          <path d="M356 252H379V174H400" />
        </g>
        <g className="auth-art-flow" strokeDasharray="7 11">
          <path d="M176 132H203V108H236" />
          <path d="M176 132H203V252H236" style={{ animationDelay: '-.6s' }} />
          <path d="M356 108H379V174H400" style={{ animationDelay: '-1.1s' }} />
          <path d="M356 252H379V174H400" style={{ animationDelay: '-1.7s' }} />
        </g>
      </g>

      {/* La familia tipográfica llega por CSS (.auth-art), no como atributo:
          var() no se sustituye de forma fiable en atributos de presentación. */}
      <g fontSize="12" fontWeight="600" letterSpacing="-.01em">
        {/* Nodo origen */}
        <rect x="56" y="103" width="120" height="58" rx="12" fill="url(#aaNode)" stroke="rgba(255,255,255,.18)" />
        <circle cx="76" cy="132" r="9" fill="rgba(74,139,232,.28)" stroke="#4A8BE8" strokeWidth="1.5" />
        <text x="94" y="136" fill="rgba(255,255,255,.88)">Usuario</text>

        {/* Nodo seleccionado: manijas de selección como en el editor */}
        <rect x="236" y="79" width="120" height="58" rx="12" fill="url(#aaNodeSel)" stroke="#4A8BE8" />
        <circle cx="256" cy="108" r="9" fill="rgba(255,255,255,.22)" stroke="#FFFFFF" strokeWidth="1.5" />
        <text x="274" y="112" fill="#FFFFFF">API</text>
        <g fill="#FFFFFF" stroke="#1763D0" strokeWidth="1.5">
          <rect x="232" y="75" width="8" height="8" rx="2" />
          <rect x="352" y="75" width="8" height="8" rx="2" />
          <rect x="232" y="133" width="8" height="8" rx="2" />
          <rect x="352" y="133" width="8" height="8" rx="2" />
        </g>

        <rect x="236" y="223" width="120" height="58" rx="12" fill="url(#aaNode)" stroke="rgba(255,255,255,.18)" />
        <g stroke="#4A8BE8" strokeWidth="1.5" fill="none">
          <ellipse cx="256" cy="245" rx="9" ry="3.6" />
          <path d="M247 245v10c0 2 4 3.6 9 3.6s9-1.6 9-3.6v-10" />
        </g>
        <text x="274" y="256" fill="rgba(255,255,255,.88)">Datos</text>

        <rect x="400" y="145" width="90" height="58" rx="12" fill="url(#aaNode)" stroke="rgba(255,255,255,.18)" />
        <path
          d="M435 180a8 8 0 0 1 1-15.8 11 11 0 0 1 20.6 3.4A6.2 6.2 0 0 1 455 180Z"
          fill="rgba(74,139,232,.25)" stroke="#4A8BE8" strokeWidth="1.5" strokeLinejoin="round"
        />
        <text x="445" y="196" textAnchor="middle" fill="rgba(255,255,255,.88)">Nube</text>
      </g>

      {/* Barra de reproducción: la animación es el producto */}
      <g>
        <rect x="186" y="316" width="148" height="30" rx="15" fill="#16233D" stroke="rgba(255,255,255,.16)" />
        <path d="M203 325l10 6-10 6z" fill="#4A8BE8" />
        <rect x="221" y="329" width="96" height="4" rx="2" fill="rgba(255,255,255,.16)" />
        <rect className="auth-art-progress" x="221" y="329" width="96" height="4" rx="2" fill="#4A8BE8" />
      </g>
    </svg>
  )
}
