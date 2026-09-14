import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authService } from '../services'
import { setAuth, clearAuth, getStoredUser } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }

    // Show the cached user immediately, then confirm the token with the server.
    setUser(getStoredUser())

    authService
      .getProfile()
      .then((profile) => {
        setUser(profile)
        setAuth(token, profile)
      })
      .catch(() => {
        clearAuth()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    const { token, user: userData } = await authService.login(email, password)
    setAuth(token, userData)
    setUser(userData)
    return userData
  }, [])

  const register = useCallback(async (name, email, password) => {
    const { token, user: userData } = await authService.register(name, email, password)
    setAuth(token, userData)
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(() => {
    clearAuth()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
