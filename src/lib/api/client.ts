export interface ApiEnvelope<T> {
  success: boolean
  data: T | null
  meta: unknown
  errors: Array<{ code: string; message: string }> | null
}

export class ApiError extends Error {
  status: number
  code: string

  constructor(message: string, status: number, code = 'API_ERROR') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

const API_BASE_URL = (import.meta.env.VITE_DRAWWWY_API_URL || 'http://localhost:8080/api/v1').replace(/\/$/, '')

export function apiBaseUrl(): string {
  return API_BASE_URL
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`)

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })
  const envelope = await readEnvelope<T>(response)
  if (!response.ok || !envelope.success) {
    const first = envelope.errors?.[0]
    throw new ApiError(first?.message || response.statusText || 'Error de API', response.status, first?.code)
  }
  return envelope.data as T
}

async function readEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  try {
    return await response.json() as ApiEnvelope<T>
  } catch {
    return {
      success: response.ok,
      data: null,
      meta: null,
      errors: response.ok ? null : [{ code: 'INVALID_RESPONSE', message: 'Respuesta invalida del servidor' }],
    }
  }
}
