import { generateToken } from './service'
import { disconnectSocket } from './socketClient'
import type { LoginCredentials } from '../types'

const TOKEN_KEY = 'token'

export async function login(credentials: LoginCredentials): Promise<void> {
  const token = await generateToken(credentials)
  localStorage.setItem(TOKEN_KEY, token)
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY)
  disconnectSocket()
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function isAuthenticated(): boolean {
  return getToken() !== null
}
