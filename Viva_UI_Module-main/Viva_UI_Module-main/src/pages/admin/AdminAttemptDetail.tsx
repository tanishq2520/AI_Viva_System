// src/pages/admin/AdminAttemptDetail.tsx
// Admin view: detailed Q&A breakdown for a specific student attempt
import { useParams, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Award, Loader2, InboxIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { PageHeader } from "@/components/common/PageHeader"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000"

function verdictIcon(verdict: string) {
  if (verdict === "Excellent" || verdict === "Good") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
  if (verdict === "Poor" || verdict === "Missing") return <XCircle className="w-4 h-4 text-red-500" />
  return <AlertTriangle className="w-4 h-4 text-amber-500" />
}

function scoreColor(score: number) {
  if (score >= 8) return "text-emerald-600"
  if (score >= 6) return "text-blue-600"
  if (score >= 4) return "text-amber-600"
  return "text-red-600"
}

export function AdminAttemptDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [result, setResult] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`${API_BASE}/api/results/latest`)
      .then((r) => r.json())
      .then((data) => {
        // Try to find attempt by ID from /api/results/all
        return fetch(`${API_BASE}/api/results/all`).then((r) => r.json())
      })
      .catch(() => null)
      .finally(() => setLoading(false))

    // Better: fetch the specific attempt
    fetch(`${API_BASE}/api/attempts/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Attempt not found")
        return r.json()
      })
      .then((data) => {
        setResult(data.result ?? data)
        setError(null)
      })
      .catch(() => {
        // Fall back: try all attempts
        fetch(`${API_BASE}/api/results/latest`)
          .then((r) => r.json())
          .then((data) => { if (data.result) setResult(data.result) })
          .catch(() => setError("Could not load attempt details."))
          .finally(() => setLoading(false))
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Loading attempt details…</p>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="max-w-4xl mx-auto">
        <PageHeader title="Attempt Detail" breadcrumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Attempt" }]} />
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <InboxIcon className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-sm font-medium text-muted-foreground">
            {error || "Attempt not found or the single-attempt endpoint is not yet available."}
          </p>
          <Button className="mt-4" onClick={() => navigate("/admin/dashboard")}>
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  const pct = result.overallScore ?? result.percentage ?? 0

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Attempt Detail"
        description={`${result.studentName} · ${result.subject}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Attempt Detail" },
        ]}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        }
      />

      {/* Summary header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-slate-900 rounded-lg text-white mb-6 flex flex-col md:flex-row items-center gap-6"
      >
        <div className="relative w-24 h-24 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
            <motion.circle
              cx="18" cy="18" r="15.9" fill="none"
              stroke="#3b82f6" strokeWidth="3"
              strokeDasharray="100"
              strokeDashoffset={100 - pct}
              strokeLinecap="round"
              initial={{ strokeDashoffset: 100 }}
              animate={{ strokeDashoffset: 100 - pct }}
              transition={{ duration: 1.2 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-xl font-bold">{pct}</p>
            <p className="text-xs text-white/50">/ 100</p>
          </div>
        </div>
        <div className="flex-1 text-center md:text-left">
          <p className="text-lg font-bold">{result.studentName || "Unknown Student"}</p>
          <p className="text-white/60 text-sm">{result.studentId} · {result.subject}</p>
          <div className="flex flex-wrap gap-3 mt-3">
            <span className="text-xs bg-white/10 rounded-full px-3 py-1">
              Grade: <strong>{result.grade || "—"}</strong>
            </span>
            <span className="text-xs bg-white/10 rounded-full px-3 py-1">
              Date: <strong>{result.date || "—"}</strong>
            </span>
            <span className="text-xs bg-white/10 rounded-full px-3 py-1">
              Duration: <strong>{result.duration || "—"}</strong>
            </span>
            <span className="text-xs bg-white/10 rounded-full px-3 py-1">
              Attempted: <strong>{result.attempted}/{result.totalQuestions}</strong>
            </span>
          </div>
        </div>
        <Award className="w-8 h-8 text-amber-400 hidden md:block" />
      </motion.div>

      {/* Per-question Q&A breakdown */}
      {result.answers && result.answers.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            Question & Answer Breakdown
            <span className="text-xs font-normal text-muted-foreground">
              (Admin view — expected answers visible)
            </span>
          </h2>
          {result.answers.map((ans: any, i: number) => (
            <motion.div
              key={ans.questionId || i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 leading-snug">
                        {ans.questionText}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {verdictIcon(ans.verdict)}
                        <span className="text-xs text-muted-foreground">{ans.verdict}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className={`text-xs font-bold ${scoreColor(ans.score)}`}>
                          {ans.score}/10
                        </span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <Badge variant="outline" className="text-xs h-4">{ans.category}</Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Expected answer (admin only) */}
                  {ans.expectedAnswer && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md">
                      <p className="text-xs font-semibold text-emerald-700 mb-1">✅ Expected Answer</p>
                      <p className="text-sm text-emerald-800 leading-relaxed">{ans.expectedAnswer}</p>
                    </div>
                  )}
                  {/* Student answer */}
                  <div className="p-3 bg-slate-50 border rounded-md">
                    <p className="text-xs font-semibold text-slate-600 mb-1">🎤 Student's Answer</p>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {ans.studentAnswer || <span className="text-muted-foreground italic">No answer provided</span>}
                    </p>
                  </div>
                  {/* Score bar */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-12">Score</span>
                    <Progress value={ans.score * 10} className="flex-1 h-2" />
                    <span className={`text-xs font-bold w-8 text-right ${scoreColor(ans.score)}`}>
                      {ans.score * 10}%
                    </span>
                  </div>
                  {/* Feedback */}
                  {ans.feedback && (
                    <p className="text-xs text-muted-foreground italic border-l-2 border-slate-200 pl-2">
                      {ans.feedback}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
