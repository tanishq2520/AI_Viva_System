// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react"

export type Role = "student" | "faculty" | "admin" | null

export interface AuthUser {
  id: string
  name: string
  email: string
  role: Role
  department: string
  // student specific
  rollNumber?: string
  semester?: string
  gpa?: number
  // faculty specific
  employeeId?: string
  designation?: string
  coursesManaged?: number
}

export interface RegisterResult {
  success: boolean
  error?: string
}

interface AuthContextType {
  user: AuthUser | null
  role: Role
  login: (email: string, role: Role) => boolean
  logout: () => void
  register: (data: any, role: Role) => RegisterResult
  updateUser: (data: Partial<AuthUser>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const DEFAULT_STUDENT: AuthUser = {
  id: "student-1",
  name: "Akash",
  email: "akash@viva.edu",
  role: "student",
  department: "Computer Science",
  rollNumber: "CS21B04",
  semester: "7th",
  gpa: 8.8,
}

const DEFAULT_FACULTY: AuthUser = {
  id: "faculty-1",
  name: "Dr. Mamali",
  email: "faculty@viva.edu",
  role: "faculty",
  department: "Computer Science",
  employeeId: "FAC-2026",
  designation: "Professor",
  coursesManaged: 4,
}

const DEFAULT_ADMIN: AuthUser = {
  id: "admin-1",
  name: "System Admin",
  email: "admin@viva.edu",
  role: "admin",
  department: "Administration",
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [role, setRole] = useState<Role>(null)

  // Load active session on mount
  useEffect(() => {
    const pathname = window.location.pathname
    let targetRole: Role = null
    if (pathname.startsWith("/student")) targetRole = "student"
    else if (pathname.startsWith("/faculty")) targetRole = "faculty"
    else if (pathname.startsWith("/admin")) targetRole = "admin"

    const sessionKey = targetRole ? `viva_session_${targetRole}` : "viva_session"
    const session = localStorage.getItem(sessionKey) || localStorage.getItem("viva_session")

    if (session) {
      try {
        const parsed: AuthUser = JSON.parse(session)
        // If the URL specifies a role, enforce that role's appropriate user
        if (targetRole && parsed.role !== targetRole) {
          const fallback = targetRole === "faculty" ? DEFAULT_FACULTY : targetRole === "admin" ? DEFAULT_ADMIN : DEFAULT_STUDENT
          setUser(fallback)
          setRole(targetRole)
        } else {
          setUser(parsed)
          setRole(parsed.role)
        }
      } catch {
        const fallback = targetRole === "faculty" ? DEFAULT_FACULTY : targetRole === "admin" ? DEFAULT_ADMIN : DEFAULT_STUDENT
        setUser(fallback)
        setRole(targetRole)
      }
    } else {
      // Default initialization based on current route
      const fallback = targetRole === "faculty" ? DEFAULT_FACULTY : targetRole === "admin" ? DEFAULT_ADMIN : DEFAULT_STUDENT
      setUser(fallback)
      setRole(targetRole)
    }
  }, [])

  function login(email: string, targetRole: Role) {
    const usersStr = localStorage.getItem("viva_users")
    let found: AuthUser | undefined

    if (usersStr) {
      try {
        const users: AuthUser[] = JSON.parse(usersStr)
        found = users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.role === targetRole)
      } catch (e) {
        console.error(e)
      }
    }

    // Fallback default users if not registered
    if (!found) {
      if (targetRole === "faculty") {
        found = { ...DEFAULT_FACULTY, email }
      } else if (targetRole === "admin") {
        found = { ...DEFAULT_ADMIN, email }
      } else {
        found = { ...DEFAULT_STUDENT, email }
      }
    }

    setUser(found)
    setRole(found.role)

    // Store in role-specific session to prevent crosstalk
    localStorage.setItem(`viva_session_${targetRole}`, JSON.stringify(found))
    localStorage.setItem("viva_session", JSON.stringify(found))
    return true
  }

  function logout() {
    if (role) {
      localStorage.removeItem(`viva_session_${role}`)
    }
    localStorage.removeItem("viva_session")
    setUser(null)
    setRole(null)
  }

  function register(data: any, targetRole: Role): RegisterResult {
    const usersStr = localStorage.getItem("viva_users")
    let users: AuthUser[] = []
    if (usersStr) {
      try {
        users = JSON.parse(usersStr)
      } catch (e) {}
    }

    // Duplicate email check
    const emailExists = users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())
    if (emailExists) {
      return {
        success: false,
        error: "An account with this email address already exists. Please sign in instead.",
      }
    }

    // Duplicate roll number check (students only)
    if (targetRole === "student" && data.rollNumber) {
      const rollExists = users.some((u) => u.rollNumber?.toLowerCase() === data.rollNumber.toLowerCase())
      if (rollExists) {
        return {
          success: false,
          error: "An account with this Roll Number already exists.",
        }
      }
    }

    const newUser: AuthUser = {
      id: `${targetRole}-${Date.now()}`,
      name: data.name,
      email: data.email,
      role: targetRole,
      department: data.department || "Computer Science",
      ...(targetRole === "student"
        ? {
            rollNumber: data.rollNumber || "CS21B04",
            semester: data.semester || "7th",
            gpa: 8.5,
          }
        : {
            employeeId: data.employeeId || "FAC-2026",
            designation: data.designation || "Professor",
            coursesManaged: 4,
          }),
    }

    users.push(newUser)
    localStorage.setItem("viva_users", JSON.stringify(users))

    // Set as active session
    setUser(newUser)
    setRole(targetRole)
    localStorage.setItem(`viva_session_${targetRole}`, JSON.stringify(newUser))
    localStorage.setItem("viva_session", JSON.stringify(newUser))

    return { success: true }
  }

  function updateUser(data: Partial<AuthUser>) {
    if (!user) return
    const updatedUser = { ...user, ...data }
    setUser(updatedUser)
    if (updatedUser.role) {
      localStorage.setItem(`viva_session_${updatedUser.role}`, JSON.stringify(updatedUser))
    }
    localStorage.setItem("viva_session", JSON.stringify(updatedUser))

    const usersStr = localStorage.getItem("viva_users")
    if (usersStr) {
      try {
        const users: AuthUser[] = JSON.parse(usersStr)
        const existingIdx = users.findIndex((u) => u.id === user.id)
        if (existingIdx >= 0) {
          users[existingIdx] = updatedUser
          localStorage.setItem("viva_users", JSON.stringify(users))
        }
      } catch (e) {}
    }
  }

  return (
    <AuthContext.Provider value={{ user, role, login, logout, register, updateUser }}>
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
