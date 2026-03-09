"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import {
  type User,
  apiLogin,
  apiSignUp,
  apiGetMe,
  apiUpdateProfile,
  getToken,
  setToken,
  clearToken,
} from "@/lib/api"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  updateProfile: (data: { name?: string }) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setIsLoading(false)
      return
    }
    apiGetMe()
      .then((res) => setUser(res.user))
      .catch(() => {
        clearToken()
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password)
    setToken(res.token)
    setUser(res.user)
  }, [])

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await apiSignUp(name, email, password)
      setToken(res.token)
      setUser(res.user)
    },
    []
  )

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  const updateProfile = useCallback(async (data: { name?: string }) => {
    const res = await apiUpdateProfile(data)
    setUser(res.user)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signUp,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
