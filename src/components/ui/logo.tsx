import { Link } from 'react-router-dom'

/**
 * Marca de Drawwwy.
 *
 * El símbolo se sirve desde public/ sin reinterpretar la identidad, pero el
 * wordmark se compone como texto vivo en lugar de usar DrawwwyLogo.png: ese
 * archivo es RGB con fondo blanco opaco y letras navy, así que sobre el tema
 * oscuro se vería como un rectángulo blanco. Como texto hereda --text y --brand,
 * queda nítido en cualquier zoom y respeta el corte de color del lockup
 * («Dra» y «y» en el color de texto, las «w» en el azul de marca).
 */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <img
      className="logo-mark"
      src="/DrawwwySVG.svg"
      width={size}
      height={size}
      alt=""
      draggable={false}
    />
  )
}

/** `to` navega al dashboard (usado en el header del editor); en el propio dashboard se omite. */
export function Logo({ to }: { to?: string }) {
  const content = (
    <div className="logo">
      <LogoMark />
      <span className="wordmark" aria-label="Drawwwy">
        Dra<b>www</b>y
      </span>
    </div>
  )
  return to ? (
    <Link to={to} className="logo-link" aria-label="Ir al panel">
      {content}
    </Link>
  ) : (
    content
  )
}
