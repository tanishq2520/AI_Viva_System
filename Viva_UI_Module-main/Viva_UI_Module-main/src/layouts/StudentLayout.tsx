// src/layouts/StudentLayout.tsx
import { Outlet, useNavigate } from "react-router-dom"
import { Sidebar } from "@/components/common/Sidebar"
import { Topbar } from "@/components/common/Topbar"
import { useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"

function getPageMeta(pathname: string) {
  const map: Record<string, { title: string; subtitle?: string }> = {
    "/student/dashboard": { title: "Dashboard", subtitle: "Track your viva progress" },
    "/student/instructions": { title: "Viva Instructions", subtitle: "Read carefully before starting" },
    "/student/viva": { title: "Viva Examination" },
    "/student/completion": { title: "Examination Completed", subtitle: "Your responses have been recorded" },
    "/student/results": { title: "Results", subtitle: "Your performance summary" },
    "/student/feedback": { title: "Personalized Feedback", subtitle: "Detailed feedback from your examiner" },
  }
  return map[pathname] ?? { title: "VivaAI" }
}

export function StudentLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const meta = getPageMeta(location.pathname)

  const userRole = user ? [user.department, user.semester]
    .filter(Boolean)
    .join(" · ") : "Student"

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar role="student" onLogout={() => { logout(); navigate("/") }} />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar
          title={meta.title}
          subtitle={meta.subtitle}
          user={user?.name ? { name: user.name, role: userRole } : undefined}
        />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
