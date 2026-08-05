/**
 * Arranque del flujo OAuth de Google.
 *
 * Vive fuera de los componentes porque lo disparan dos sitios distintos
 * (la pantalla /login y, como atajo, cualquier CTA de la app) y ambos deben
 * mandar exactamente el mismo `redirect_uri`: Google compara la URI contra la
 * lista blanca de la consola, así que cualquier divergencia rompe el login.
 */
export function startGoogleLogin(): { ok: boolean; error?: string } {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  if (!clientId) {
    return { ok: false, error: 'Falta configurar VITE_GOOGLE_CLIENT_ID para iniciar sesion con Google.' }
  }

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', `${window.location.origin}/auth-callback`)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'select_account')
  window.location.href = url.toString()
  return { ok: true }
}
