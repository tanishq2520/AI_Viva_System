// src/pages/student/ResultDashboard.tsx
import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, ResponsiveContainer, PolarRadiusAxis,
} from "recharts"
import { Award, ArrowRight, TrendingUp, InboxIcon, BookOpen, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { PageHeader } from "@/components/common/PageHeader"
import { fetchLatestResult, fetchStudentResult, fetchAttemptById, fetchStudentAttempts, fetchAllAttempts, type VivaResult } from "@/services/api"
import { useAuth } from "@/contexts/AuthContext"

const scoreColor = (score: number) =>
  score >= 80 ? "#16a34a" : score >= 60 ? "#2563eb" : score >= 40 ? "#d97706" : "#dc2626"

export function ResultDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [result, setResult] = useState<VivaResult | null>(null)
  const [attemptsList, setAttemptsList] = useState<any[]>([])
  const [selectedAttemptId, setSelectedAttemptId] = useState<string>("")
  const [loading, setLoading] = useState(true)

  // 1. Fetch list of all student attempts
  useEffect(() => {
    const studentId = user?.rollNumber ?? user?.id
    const fetcher = studentId ? fetchStudentAttempts(studentId) : fetchAllAttempts()
    
    fetcher
      .then((list) => {
        const validList = list && list.length > 0 ? list : []
        setAttemptsList(validList)

        // Determine default attempt ID to view:
        // Priority 1: Just-completed viva test ID (viva_last_completed_attempt_id)
        // Priority 2: Selected viva test ID (selected_result_attempt_id)
        // Priority 3: First attempt in list
        const lastCompleted = localStorage.getItem("viva_last_completed_attempt_id")
        const savedSelected = localStorage.getItem("selected_result_attempt_id")

        const defaultId = (lastCompleted && validList.some(a => String(a.id) === String(lastCompleted)))
          ? String(lastCompleted)
          : (savedSelected && validList.some(a => String(a.id) === String(savedSelected)))
          ? String(savedSelected)
          : validList[0]?.id ? String(validList[0].id) : ""

        if (defaultId) {
          setSelectedAttemptId(defaultId)
          localStorage.setItem("selected_result_attempt_id", defaultId)
        }
      })
      .catch(() => {})
  }, [user?.rollNumber, user?.id])

  // 2. Fetch specific attempt details whenever selectedAttemptId changes
  useEffect(() => {
    setLoading(true)
    if (selectedAttemptId) {
      fetchAttemptById(selectedAttemptId)
        .then((r) => {
          if (r) setResult(r)
          else fetchLatestResult().then(setResult).catch(() => setResult(null))
        })
        .catch(() => fetchLatestResult().then(setResult).catch(() => setResult(null)))
        .finally(() => setLoading(false))
    } else {
      fetchLatestResult()
        .then((r) => setResult(r))
        .catch(() => setResult(null))
        .finally(() => setLoading(false))
    }
  }, [selectedAttemptId])

  function handleSelectAttempt(id: string) {
    setSelectedAttemptId(id)
    localStorage.setItem("selected_result_attempt_id", id)
  }

  const hasResults = !!result
  const radarData = result
    ? Object.entries(result.scores).map(([key, val]) => ({
        subject: key.replace(/([A-Z])/g, " $1").trim().replace(/^./, (s) => s.toUpperCase()),
        score: val,
        fullMark: 100,
      }))
    : []

  if (loading || !hasResults) {
    return (
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Result Dashboard"
          breadcrumbs={[
            { label: "Dashboard", href: "/student/dashboard" },
            { label: "Results" },
          ]}
        />
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <InboxIcon className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">{loading ? "Loading Results…" : "No Results Available"}</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
            {loading ? "Fetching your evaluated examination results." : "Your viva results will appear here after completing an assessment."}
          </p>
          <Button onClick={() => navigate("/student/instructions")}>
            Take a Viva <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Result Dashboard"
        description={[result.subject, result.date].filter(Boolean).join(" · ")}
        breadcrumbs={[
          { label: "Dashboard", href: "/student/dashboard" },
          { label: "Results" },
        ]}
        actions={
          <div className="flex items-center gap-3 flex-wrap">
            {/* Viva Assessment Dropdown Selector */}
            {attemptsList.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
                <Layers className="w-4 h-4 text-blue-600 hidden sm:block ml-1" />
                <select
                  value={selectedAttemptId}
                  onChange={(e) => handleSelectAttempt(e.target.value)}
                  className="bg-white border rounded-md text-xs font-semibold p-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  {attemptsList.map((att) => (
                    <option key={att.id} value={String(att.id)}>
                      {att.subject} — {att.date} (Score: {att.score ?? att.percentage}%)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Button onClick={() => navigate("/student/feedback")}>
              View Feedback <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      {/* Overall score banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-slate-900 rounded-lg text-white mb-6 flex flex-col md:flex-row items-center gap-6 shadow-md"
      >
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
            <motion.circle
              cx="18" cy="18" r="15.9" fill="none"
              stroke="#3b82f6" strokeWidth="3"
              strokeDasharray="100"
              strokeDashoffset={100 - result.overallScore}
              strokeLinecap="round"
              initial={{ strokeDashoffset: 100 }}
              animate={{ strokeDashoffset: 100 - result.overallScore }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-2xl font-bold">{result.overallScore}</p>
            <p className="text-xs text-white/50">/ 100</p>
          </div>
        </div>
        <div className="text-center md:text-left flex-1">
          <div className="flex items-center gap-2 justify-center md:justify-start mb-1">
            <h2 className="text-xl font-bold">{result.subject}</h2>
            {result.grade !== "—" && (
              <Badge className="bg-blue-600 text-white border-0">{result.grade}</Badge>
            )}
          </div>
          <p className="text-white/60 text-sm mb-3">Evaluated on {result.date || "Today"}</p>
          <div className="grid grid-cols-3 gap-4">
            <div><p className="text-sm font-semibold">{result.attempted}/{result.totalQuestions}</p><p className="text-xs text-white/40">Attempted</p></div>
            <div><p className="text-sm font-semibold">{result.duration || "—"}</p><p className="text-xs text-white/40">Duration</p></div>
            <div><p className="text-sm font-semibold">{result.date || "—"}</p><p className="text-xs text-white/40">Date</p></div>
          </div>
        </div>
        <Award className="w-8 h-8 text-amber-400 hidden md:block" />
      </motion.div>

      {/* Score breakdown metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {Object.entries(result.scores).map(([key, val], i) => {
          const label = key.replace(/([A-Z])/g, " $1").trim().replace(/^./, (s) => s.toUpperCase())
          return (
            <motion.div key={key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold" style={{ color: val > 0 ? scoreColor(val) : "#94a3b8" }}>
                    {val > 0 ? val : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 font-semibold">{label}</p>
                  <Progress value={val} className="mt-2 h-1.5" />
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Performance Radar Chart */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Performance Radar</CardTitle></CardHeader>
          <CardContent>
            {radarData.some((d) => d.score > 0) ? (
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-60 text-muted-foreground text-sm">No score data</div>
            )}
          </CardContent>
        </Card>

        {/* Section-wise performance */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Section-wise Performance</CardTitle></CardHeader>
          <CardContent>
            {result.sectionScores.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={result.sectionScores} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => [`${v}%`, "Score"]} />
                  <Bar dataKey="score" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-60 text-muted-foreground text-sm">No section data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance trend chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" /> Performance Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {result.performanceTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={result.performanceTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="attempt" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v}%`, "Score"]} />
                <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", strokeWidth: 0, r: 4 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No trend data yet</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
