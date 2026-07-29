import { create } from 'zustand'
import { apiRequest } from '../api/client'

interface AuthUser {
  id: number
  email: string
  name: string
  avatar_url?: string
}

interface GoogleLoginResponse {
  token: string
  user: AuthUser
}

interface RefreshResponse {
  token: string
}

type AuthStatus = 'unknown' | 'guest' | 'authenticated'

const TOKEN_KEY = 'drawwwy.auth.accessToken'

interface AuthStore {
  status: AuthStatus
  user: AuthUser | null
  accessToken: string | null
  init: () => Promise<void>
  loginWithGoogleCode: (code: string) => Promise<void>
  setToken: (token: string) => Promise<void>
  refresh: () => Promise<void>
  logout: () => void
}

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function writeToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* noop */
  }
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  status: 'unknown',
  user: null,
  accessToken: readToken(),

  init: async () => {
    const token = get().accessToken || readToken()
    if (!token) {
      set({ status: 'guest', user: null, accessToken: null })
      return
    }
    try {
      const user = await apiRequest<AuthUser>('/auth/me', { token })
      set({ status: 'authenticated', user, accessToken: token })
    } catch {
      writeToken(null)
      set({ status: 'guest', user: null, accessToken: null })
    }
  },

  loginWithGoogleCode: async code => {
    const result = await apiRequest<GoogleLoginResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ code }),
    })
    writeToken(result.token)
    set({ status: 'authenticated', user: result.user, accessToken: result.token })
  },

  setToken: async token => {
    const user = await apiRequest<AuthUser>('/auth/me', { token })
    writeToken(token)
    set({ status: 'authenticated', user, accessToken: token })
  },

  refresh: async () => {
    const token = get().accessToken
    if (!token) throw new Error('No hay sesion activa')
    const result = await apiRequest<RefreshResponse>('/auth/refresh', { method: 'POST', token })
    writeToken(result.token)
    set({ accessToken: result.token })
  },

  logout: () => {
    writeToken(null)
    set({ status: 'guest', user: null, accessToken: null })
  },
}))
