/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import * as authService from '../services/authService'
import type { LoginCredentials } from '../types'

interface AuthContextValue {
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    authService.isAuthenticated()
  )

  const login = useCallback(async (credentials: LoginCredentials) => {
    await authService.login(credentials)
    setIsAuthenticated(true)
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    window.dispatchEvent(new Event('timer:session-ended'))
    setIsAuthenticated(false)
  }, [])

  useEffect(() => {
    const handleSessionExpired = () => {
      logout()
    }

    window.addEventListener('auth:session-expired', handleSessionExpired)
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired)
  }, [logout])

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
