// src/pages/admin/AdminDashboard.tsx
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Users, BookOpen, Monitor, TrendingUp, ShieldCheck, Shield,
  Award, Search, RefreshCw, Eye, ChevronRight, InboxIcon, Upload,
  FileText, AlertCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/common/StatCard"
import { PageHeader } from "@/components/common/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { fetchAllAttempts } from "@/services/api"

function gradeColor(grade: string) {
  if (grade === "A+" || grade === "A") return "bg-emerald-100 text-emerald-700"
  if (grade === "B+") return "bg-blue-100 text-blue-700"
  if (grade === "B") return "bg-sky-100 text-sky-700"
  if (grade === "C") return "bg-amber-100 text-amber-700"
  return "bg-red-100 text-red-700"
}

export function AdminDashboard() {
  const navigate = useNavigate()
  const [attempts, setAttempts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [refreshing, setRefreshing] = useState(false)

  function loadData() {
    setRefreshing(true)
    fetchAllAttempts()
      .then((data) => {
        setAttempts(data || [])
        setError(null)
      })
      .catch((err) => {
        console.error("Admin: failed to load attempts", err)
        setError("Could not connect to the Result Storage API. Make sure it is running on port 8010.")
      })
      .finally(() => {
        setLoading(false)
        setRefreshing(false)
      })
  }

  useEffect(() => {
    loadData()
    const timer = setInterval(loadData, 30000) // auto-refresh every 30s
    return () => clearInterval(timer)
  }, [])

  const filtered = attempts.filter(
    (a) =>
      a.studentName?.toLowerCase().includes(search.toLowerCase()) ||
      a.studentId?.toLowerCase().includes(search.toLowerCase()) ||
      a.subject?.toLowerCase().includes(search.toLowerCase())
  )

  const avgScore =
    attempts.length > 0
      ? Math.round(attempts.reduce((s, a) => s + (a.percentage ?? 0), 0) / attempts.length)
      : 0

  const uniqueStudents = new Set(attempts.map((a) => a.studentId)).size

  const passCount = attempts.filter((a) => (a.percentage ?? 0) >= 50).length

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Admin Control Center"
        description="Live institution-wide viva metrics and student management."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={refreshing}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => navigate("/admin/upload")} className="gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Upload Q&amp;A PDF
            </Button>
          </div>
        }
      />

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-6 text-sm text-red-700"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Backend Connection Issue</p>
            <p className="text-red-600/80 mt-0.5">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Attempts"
          value={loading ? "…" : attempts.length}
          icon={Monitor}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
          index={0}
        />
        <StatCard
          title="Unique Students"
          value={loading ? "…" : uniqueStudents}
          icon={Users}
          iconColor="text-green-600"
          iconBg="bg-green-50"
          index={1}
        />
        <StatCard
          title="Avg Score"
          value={loading ? "…" : attempts.length > 0 ? `${avgScore}%` : "—"}
          icon={TrendingUp}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
          index={2}
        />
        <StatCard
          title="Pass Rate"
          value={loading ? "…" : attempts.length > 0 ? `${Math.round((passCount / attempts.length) * 100)}%` : "—"}
          icon={Award}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          description={`${passCount} of ${attempts.length} passed`}
          index={3}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-6">
        {/* Quick admin actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              Admin Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Upload Q&A PDF", desc: "Add questions from PDF/DOCX", icon: Upload, path: "/admin/upload" },
              { label: "View Question Sets", desc: "Manage uploaded sets", icon: BookOpen, path: "/admin/questions" },
              { label: "Student Records", desc: "View enrolled students", icon: Users, path: "/admin/students" },
              { label: "Reports & Analytics", desc: "Performance insights", icon: FileText, path: "/admin/reports" },
            ].map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left border border-transparent hover:border-slate-200"
                >
                  <div className="w-8 h-8 bg-blue-50 rounded-md flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
              )
            })}
          </CardContent>
        </Card>

        {/* Score distribution */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              Score Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                Loading…
              </div>
            ) : attempts.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                No data yet
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: "Excellent (≥80%)", color: "bg-emerald-500", count: attempts.filter((a) => a.percentage >= 80).length },
                  { label: "Good (60–79%)", color: "bg-blue-500", count: attempts.filter((a) => a.percentage >= 60 && a.percentage < 80).length },
                  { label: "Average (40–59%)", color: "bg-amber-500", count: attempts.filter((a) => a.percentage >= 40 && a.percentage < 60).length },
                  { label: "Below Average (<40%)", color: "bg-red-500", count: attempts.filter((a) => a.percentage < 40).length },
                ].map((band) => (
                  <div key={band.label} className="flex items-center gap-3">
                    <div className="text-xs text-muted-foreground w-36 flex-shrink-0">{band.label}</div>
                    <div className="flex-1">
                      <Progress
                        value={attempts.length > 0 ? (band.count / attempts.length) * 100 : 0}
                        className="h-2"
                      />
                    </div>
                    <span className="text-xs font-medium w-6 text-right">{band.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Student Attempts Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-600" />
            All Student Attempts
            {attempts.length > 0 && (
              <Badge variant="outline" className="text-xs font-normal ml-1">
                {attempts.length} total
              </Badge>
            )}
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID, subject…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
              Loading student data…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <InboxIcon className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                {search ? "No results match your search" : "No exam attempts recorded yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {search ? "Try a different search term." : "Student results will appear here after they complete viva exams."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-xs text-muted-foreground">
                    <th className="text-left p-3 pl-4 font-medium">#</th>
                    <th className="text-left p-3 font-medium">Student</th>
                    <th className="text-left p-3 font-medium">Student ID</th>
                    <th className="text-left p-3 font-medium">Subject</th>
                    <th className="text-left p-3 font-medium">Score</th>
                    <th className="text-left p-3 font-medium">Grade</th>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-right p-3 pr-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((attempt, i) => (
                    <motion.tr
                      key={attempt.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.04, 0.4) }}
                      className="border-b last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-3 pl-4 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold flex-shrink-0">
                            {(attempt.studentName || "?")[0].toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-900 truncate max-w-[140px]">
                            {attempt.studentName || "Unknown"}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground font-mono">
                        {attempt.studentId}
                      </td>
                      <td className="p-3 text-sm">{attempt.subject || "—"}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {attempt.percentage ?? "—"}%
                          </span>
                          <div className="w-16 hidden sm:block">
                            <Progress value={attempt.percentage ?? 0} className="h-1.5" />
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${gradeColor(attempt.grade || "F")}`}
                        >
                          {attempt.grade || "—"}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{attempt.date || "—"}</td>
                      <td className="p-3 pr-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => navigate(`/admin/attempt/${attempt.id}`)}
                        >
                          <Eye className="w-3 h-3" /> View
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
    </div>
  )
}
