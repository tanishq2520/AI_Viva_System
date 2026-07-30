// src/layouts/FacultyLayout.tsx
import { Outlet, useNavigate, useLocation } from "react-router-dom"
import { Sidebar } from "@/components/common/Sidebar"
import { Topbar } from "@/components/common/Topbar"
import { useAuth } from "@/contexts/AuthContext"

function getPageMeta(pathname: string) {
  const map: Record<string, { title: string; subtitle?: string }> = {
    "/faculty/dashboard": { title: "Faculty Dashboard", subtitle: "Monitor and manage viva examinations" },
    "/faculty/questions": { title: "Question Bank", subtitle: "Manage examination questions" },
    "/faculty/monitoring": { title: "Live Monitoring", subtitle: "Track active student sessions in real time" },
    "/faculty/analytics": { title: "Analytics", subtitle: "Performance insights and trends" },
    "/faculty/reports": { title: "Reports & Export", subtitle: "Generate and download reports" },
  }
  return map[pathname] ?? { title: "VivaAI Faculty" }
}

export function FacultyLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const meta = getPageMeta(location.pathname)

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar role="faculty" onLogout={() => { logout(); navigate("/") }} />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar
          title={meta.title}
          subtitle={meta.subtitle}
          user={user?.name ? { name: user.name, role: user.designation || "Faculty" } : undefined}
        />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
