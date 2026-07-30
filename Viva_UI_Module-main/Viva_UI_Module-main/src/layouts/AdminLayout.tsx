// src/layouts/AdminLayout.tsx
import { Outlet, useNavigate, useLocation, Navigate } from "react-router-dom"
import { Sidebar } from "@/components/common/Sidebar"
import { Topbar } from "@/components/common/Topbar"
import { useAuth } from "@/contexts/AuthContext"

function getPageMeta(pathname: string) {
  const map: Record<string, { title: string; subtitle?: string }> = {
    "/admin/dashboard": { title: "Admin Control Center", subtitle: "Institution-wide metrics, all student attempts, and management" },
    "/admin/upload": { title: "Upload Q&A PDF", subtitle: "Add question sets from PDF, DOCX, XLSX, or CSV files" },
    "/admin/students": { title: "User Records", subtitle: "All registered students, faculty, and admins" },
    "/admin/questions": { title: "Question Bank", subtitle: "Manage all uploaded question sets" },
    "/admin/analytics": { title: "Institution Analytics", subtitle: "High-level performance insights" },
    "/admin/reports": { title: "System Reports", subtitle: "Global reports and data export" },
  }
  if (pathname.startsWith("/admin/attempt/")) return { title: "Attempt Detail", subtitle: "Per-question Q&A breakdown (admin view)" }
  return map[pathname] ?? { title: "VivaAI Admin" }
}

export function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, role, logout } = useAuth()
  const meta = getPageMeta(location.pathname)

  if (!user || role !== "admin") {
    return <Navigate to="/admin/login" replace />
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar role="admin" onLogout={() => { logout(); navigate("/") }} />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar
          title={meta.title}
          subtitle={meta.subtitle}
          user={user?.name ? { name: user.name, role: "Administrator" } : undefined}
        />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
