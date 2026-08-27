import type { AuthUser, LoginResponse } from '@shared/contracts/auth'
import type { ConfigResponse } from '@shared/contracts/common'
import { type ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'

interface AuthContextType {
  user: AuthUser | null
  config: ConfigResponse | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  refreshMe: () => Promise<void>
  isLocalMode: boolean
  isHostedMode: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [config, setConfig] = useState<ConfigResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshMe = async () => {
    try {
      const cfg = await apiFetch<ConfigResponse>('/api/config')
      setConfig(cfg)

      const meData = await apiFetch<{ user: AuthUser }>('/api/auth/me')
      setUser(meData.user)
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshMe()
  }, [])

  const login = async (username: string, password: string): Promise<AuthUser> => {
    const res = await apiFetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    setUser(res.user)
    return res.user
  }

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    setUser(null)
  }

  const isLocalMode = config?.mode === 'local'
  const isHostedMode = config?.mode === 'hosted'

  return (
    <AuthContext.Provider
      value={{
        user,
        config,
        isLoading,
        login,
        logout,
        refreshMe,
        isLocalMode,
        isHostedMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
