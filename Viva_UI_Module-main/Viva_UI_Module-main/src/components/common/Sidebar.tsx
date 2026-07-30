// src/components/common/Sidebar.tsx
import { NavLink, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard, BookOpen, Mic2, BarChart3, Users, FileText,
  Monitor, Database, LogOut, ChevronLeft, ChevronRight, GraduationCap,
  X, Menu, Upload, Shield,
} from "lucide-react"
import { cn } from "@/utils/cn"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useState } from "react"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

interface SidebarSection {
  title?: string
  items: NavItem[]
}

interface SidebarProps {
  role: "student" | "faculty" | "admin"
  onLogout?: () => void
}

const studentNav: SidebarSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Examination",
    items: [
      { label: "Viva Instructions", href: "/student/instructions", icon: BookOpen },
      { label: "Take Viva", href: "/student/viva", icon: Mic2 },
    ],
  },
  {
    title: "Performance",
    items: [
      { label: "Results", href: "/student/results", icon: BarChart3 },
      { label: "Feedback", href: "/student/feedback", icon: FileText },
    ],
  },
]

const facultyNav: SidebarSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/faculty/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Question Bank", href: "/faculty/questions", icon: Database },
      { label: "Live Monitoring", href: "/faculty/monitoring", icon: Monitor },
    ],
  },
  {
    title: "Analytics",
    items: [
      { label: "Analytics", href: "/faculty/analytics", icon: BarChart3 },
      { label: "Reports", href: "/faculty/reports", icon: FileText },
    ],
  },
]

const adminNav: SidebarSection[] = [
  {
    items: [
      { label: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "Content",
    items: [
      { label: "Upload Q&A PDF", href: "/admin/upload", icon: Upload },
      { label: "Question Bank", href: "/admin/questions", icon: Database },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "User Records", href: "/admin/students", icon: Users },
    ],
  },
  {
    title: "Analytics",
    items: [
      { label: "Institution Stats", href: "/admin/analytics", icon: BarChart3 },
      { label: "System Reports", href: "/admin/reports", icon: FileText },
    ],
  },
]

export function Sidebar({ role, onLogout }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const sections = role === "student" ? studentNav : role === "faculty" ? facultyNav : adminNav

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={cn("flex items-center gap-3 p-4 border-b border-white/10", collapsed && "justify-center")}>
        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <GraduationCap className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p className="text-white font-semibold text-sm leading-tight">VivaAI</p>
            <p className="text-white/50 text-xs">Examination System</p>
          </motion.div>
        )}
      </div>

      {/* Role indicator */}
      {!collapsed && (
        <div className="px-4 py-2">
          <span className="text-xs font-medium text-blue-400 uppercase tracking-widest">
            {role === "student" ? "Student Portal" : role === "faculty" ? "Faculty Portal" : "Admin Portal"}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {sections.map((section, si) => (
          <div key={si} className="mb-2">
            {section.title && !collapsed && (
              <p className="px-3 py-1 text-xs font-semibold text-white/30 uppercase tracking-widest">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const Icon = item.icon
              const active = location.pathname === item.href
              return (
                <NavLink key={item.href} to={item.href} onClick={() => setMobileOpen(false)}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 cursor-pointer",
                      collapsed && "justify-center",
                      active
                        ? "bg-blue-600 text-white"
                        : "text-white/60 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <Icon className={cn("w-4 h-4 flex-shrink-0", active && "text-white")} />
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                    {!collapsed && item.badge !== undefined && (
                      <span className="ml-auto text-xs bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      <Separator className="bg-white/10" />

      {/* Bottom: logout */}
      <div className="p-2">
        <button
          onClick={onLogout}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all duration-150",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse toggle (desktop) */}
      <div className="hidden md:flex justify-end p-2">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-all"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 rounded-md text-white shadow-lg"
        onClick={() => setMobileOpen(true)}
        aria-label="Open sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "tween", duration: 0.25 }}
            className="md:hidden fixed left-0 top-0 h-full w-64 sidebar-bg z-50 shadow-2xl"
          >
            <button
              className="absolute top-4 right-4 text-white/60 hover:text-white"
              onClick={() => setMobileOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        className={cn(
          "hidden md:flex flex-col sidebar-bg h-full transition-all duration-300",
          collapsed ? "w-16" : "w-56"
        )}
        animate={{ width: collapsed ? 64 : 224 }}
        transition={{ duration: 0.2 }}
      >
        <SidebarContent />
      </motion.aside>
    </>
  )
}
