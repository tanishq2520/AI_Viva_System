// src/pages/admin/AdminStudents.tsx
// Admin page: view all registered students from localStorage
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Users, Search, InboxIcon, RefreshCw, Trash2, Shield } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/common/PageHeader"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

interface StoredUser {
  id: string
  name: string
  email: string
  role: string
  department: string
  rollNumber?: string
  semester?: string
  gpa?: number
  employeeId?: string
  designation?: string
}

function roleColor(role: string) {
  if (role === "admin") return "bg-red-100 text-red-700"
  if (role === "faculty") return "bg-purple-100 text-purple-700"
  return "bg-blue-100 text-blue-700"
}

export function AdminStudents() {
  const [users, setUsers] = useState<StoredUser[]>([])
  const [search, setSearch] = useState("")
  const [filterRole, setFilterRole] = useState<string>("all")
  const [deleteTarget, setDeleteTarget] = useState<StoredUser | null>(null)

  function loadUsers() {
    try {
      const raw = localStorage.getItem("viva_users")
      if (raw) setUsers(JSON.parse(raw))
      else setUsers([])
    } catch {
      setUsers([])
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  function handleDelete(user: StoredUser) {
    const updated = users.filter((u) => u.id !== user.id)
    setUsers(updated)
    localStorage.setItem("viva_users", JSON.stringify(updated))
    setDeleteTarget(null)
  }

  const filtered = users.filter((u) => {
    const matchSearch =
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.rollNumber?.toLowerCase().includes(search.toLowerCase()) ||
      u.department?.toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole === "all" || u.role === filterRole
    return matchSearch && matchRole
  })

  const studentCount = users.filter((u) => u.role === "student").length
  const facultyCount = users.filter((u) => u.role === "faculty").length
  const adminCount = users.filter((u) => u.role === "admin").length

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="User Records"
        description="All registered users in the VivaAI system."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "User Records" },
        ]}
        actions={
          <Button variant="outline" size="sm" onClick={loadUsers} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Students", value: studentCount, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Faculty", value: facultyCount, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Admins", value: adminCount, color: "text-red-600", bg: "bg-red-50" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`${s.bg} rounded-lg p-4 text-center`}
          >
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-600" />
            Registered Users
            <Badge variant="outline" className="text-xs font-normal">
              {users.length} total
            </Badge>
          </CardTitle>
          <div className="flex gap-2">
            {/* Role filter */}
            <div className="flex rounded-lg border overflow-hidden">
              {["all", "student", "faculty", "admin"].map((r) => (
                <button
                  key={r}
                  onClick={() => setFilterRole(r)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors capitalize ${
                    filterRole === r
                      ? "bg-slate-900 text-white"
                      : "bg-white text-muted-foreground hover:bg-slate-50"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="relative w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by name, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <InboxIcon className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                {search || filterRole !== "all" ? "No users match your search" : "No users registered yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Users appear here when they register through the portal.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-xs text-muted-foreground">
                    <th className="text-left p-3 pl-4 font-medium">#</th>
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">Role</th>
                    <th className="text-left p-3 font-medium">Department</th>
                    <th className="text-left p-3 font-medium">Roll / ID</th>
                    <th className="text-left p-3 font-medium">Semester</th>
                    <th className="text-right p-3 pr-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u, i) => (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.04, 0.4) }}
                      className="border-b last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-3 pl-4 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-semibold flex-shrink-0">
                            {u.name?.[0]?.toUpperCase() || "?"}
                          </div>
                          <span className="font-medium text-slate-900">{u.name || "—"}</span>
                        </div>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{u.email}</td>
                      <td className="p-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${roleColor(u.role)}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 text-sm">{u.department || "—"}</td>
                      <td className="p-3 text-xs font-mono text-muted-foreground">
                        {u.rollNumber || u.employeeId || "—"}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{u.semester || "—"}</td>
                      <td className="p-3 pr-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteTarget(u)}
                          disabled={u.role === "admin"}
                          title={u.role === "admin" ? "Cannot remove admin accounts here" : "Remove user"}
                        >
                          {u.role === "admin" ? <Shield className="w-3.5 h-3.5 text-muted-foreground" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove User?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove <span className="font-semibold text-slate-900">{deleteTarget?.name}</span> ({deleteTarget?.email}) from the system?
            Their exam history in the database will remain intact.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget)}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
