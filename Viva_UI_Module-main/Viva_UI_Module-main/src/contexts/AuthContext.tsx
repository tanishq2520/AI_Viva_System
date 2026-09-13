// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react"
import { API_BASE } from "../services/api"

export type Role = "student" | "faculty" | "admin" | null

export interface AuthUser {
  id: string
  name: string
  email: string
  role: Role
  department?: string
  student_number?: string
  // UI legacy fields:
  rollNumber?: string
  employeeId?: string
  designation?: string
  semester?: string
  gpa?: number
}

export interface RegisterResult {
  success: boolean
  error?: string
}

interface AuthContextType {
  user: AuthUser | null
  role: Role
  isLoading: boolean
  login: (email: string, role: Role, password?: string) => Promise<boolean>
  logout: () => void
  register: (data: any, role: Role) => Promise<RegisterResult>
  updateUser: (data: Partial<AuthUser>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [role, setRole] = useState<Role>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load active session on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("viva_access_token")
      const localRole = localStorage.getItem("viva_session_role") as Role
      if (token) {
        try {
          const res = await fetch(`${API_BASE}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (res.ok) {
            const data = await res.json()
            setUser(data)
            // If the user's role is teacher but they logged in as admin,
            // use localRole to preserve UI logic, otherwise use backend role.
            if (data.role === "teacher" && localRole === "admin") {
                setRole("admin")
            } else {
                setRole(data.role === "teacher" ? "faculty" : data.role)
            }
          } else {
            logout()
          }
        } catch (e) {
          console.error("Auth me error:", e)
        }
      }
      setIsLoading(false)
    }
    initAuth()
  }, [])

  async function login(email: string, targetRole: Role, password?: string): Promise<boolean> {
    if (!password) return false;

    try {
      const formData = new URLSearchParams()
      formData.append("username", email)
      formData.append("password", password)

      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      })

      if (res.ok) {
        const data = await res.json()
        localStorage.setItem("viva_access_token", data.access_token)
        localStorage.setItem("viva_session_role", targetRole || "")

        setUser(data.user)
        if (data.user.role === "teacher" && targetRole === "admin") {
            setRole("admin")
        } else {
            setRole(data.user.role === "teacher" ? "faculty" : data.user.role)
        }
        return true
      }
      return false
    } catch (e) {
      console.error("Login error:", e)
      return false
    }
  }

  function logout() {
    localStorage.removeItem("viva_access_token")
    localStorage.removeItem("viva_session_role")
    setUser(null)
    setRole(null)
  }

  async function register(data: any, targetRole: Role): Promise<RegisterResult> {
    const backendRole = targetRole === "student" ? "student" : "teacher"
    const payload = {
      email: data.email,
      password: data.password || "password123", // Default for admin auto-register if any
      name: data.fullName || data.name || "User",
      role: backendRole,
      student_number: data.rollNumber || undefined
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        // Auto-login after successful registration
        await login(data.email, targetRole, payload.password)
        return { success: true }
      } else {
        const errData = await res.json()
        return { success: false, error: errData.detail || "Registration failed" }
      }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  function updateUser(data: Partial<AuthUser>) {
    if (!user) return
    const updatedUser = { ...user, ...data }
    setUser(updatedUser)
    // We don't PUT to backend here yet, just keeping signature intact
  }

  return (
    <AuthContext.Provider value={{ user, role, isLoading, login, logout, register, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
