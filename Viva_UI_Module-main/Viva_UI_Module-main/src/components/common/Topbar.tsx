// src/components/common/Topbar.tsx
import { useState, useRef, useEffect } from "react"
import { Bell, Search, Settings, Moon, Sun, User, HelpCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { getInitials } from "@/utils/helpers"
import { useAuth } from "@/contexts/AuthContext"

interface TopbarProps {
  title: string
  subtitle?: string
  user?: { name: string; role: string }
  showSearch?: boolean
}

export function Topbar({ title, subtitle, user, showSearch = true }: TopbarProps) {
  const { user: authUser, updateUser } = useAuth()
  const [showSettings, setShowSettings] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("viva_theme") === "dark"
  })

  // Modals state
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  
  // Profile edit state
  const [editName, setEditName] = useState(authUser?.name || "")

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("viva_theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("viva_theme", "light")
    }
  }, [isDarkMode])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-6 flex-shrink-0">
      <div>
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {showSearch && (
          <div className="hidden md:flex items-center relative">
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-9 w-56 h-8 text-sm"
            />
          </div>
        )}

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-600 rounded-full" />
        </Button>

        <div className="relative" ref={settingsRef}>
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="w-4 h-4" />
          </Button>

          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 shadow-lg rounded-xl z-50 overflow-hidden"
              >
                <div className="p-2 space-y-1">
                  <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    System Settings
                  </div>
                  
                  <button 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="w-full flex items-center gap-3 px-2 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md transition-colors text-left"
                  >
                    {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
                  </button>
                  
                  <button 
                    onClick={() => {
                      setShowSettings(false)
                      setEditProfileOpen(true)
                      setEditName(authUser?.name || "")
                    }}
                    className="w-full flex items-center gap-3 px-2 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md transition-colors text-left"
                  >
                    <User className="w-4 h-4" />
                    <span>Edit Profile</span>
                  </button>
                  
                  <button 
                    onClick={() => {
                      setShowSettings(false)
                      setHelpOpen(true)
                    }}
                    className="w-full flex items-center gap-3 px-2 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md transition-colors text-left"
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>Help & Support</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {user && (
          <div className="flex items-center gap-2 pl-2 border-l">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{getInitials(authUser?.name || user.name)}</AvatarFallback>
            </Avatar>
            <div className="hidden md:block">
              <p className="text-xs font-medium leading-tight">{authUser?.name || user.name}</p>
              <p className="text-xs text-muted-foreground leading-tight">{user.role}</p>
            </div>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your personal information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            {authUser?.email && (
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={authUser.email} disabled />
              </div>
            )}
            <Button 
              onClick={() => {
                updateUser({ name: editName })
                setEditProfileOpen(false)
              }}
              className="w-full"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Help & Support Modal */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Help & Support</DialogTitle>
            <DialogDescription>Get assistance with the VivaAI platform.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm text-slate-600">
            <p>If you are experiencing issues during your examination or need to report a problem, please contact your department administrator immediately.</p>
            <div className="bg-slate-50 p-3 rounded-md space-y-2">
              <p><strong>Support Email:</strong> support@university.edu</p>
              <p><strong>IT Helpdesk:</strong> +1 (555) 019-2831</p>
              <p><strong>Hours:</strong> Mon-Fri, 8 AM - 6 PM</p>
            </div>
            <p>For urgent technical issues during a live viva, use the emergency flag button inside the examination interface.</p>
          </div>
          <Button variant="outline" onClick={() => setHelpOpen(false)} className="w-full">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </header>
  )
}
