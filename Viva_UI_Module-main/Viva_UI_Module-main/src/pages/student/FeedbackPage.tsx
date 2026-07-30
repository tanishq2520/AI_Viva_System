// src/pages/student/FeedbackPage.tsx
import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  ThumbsUp, TrendingUp, BookMarked, ChevronDown, ChevronUp,
  Star, InboxIcon, ArrowRight, Layers, AlertCircle, CheckCircle2, MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { PageHeader } from "@/components/common/PageHeader"
import { fetchAttemptById, fetchStudentAttempts, fetchAllAttempts, fetchLatestResult, fetchLatestFeedback, type FeedbackSummary, type VivaResult } from "@/services/api"
import { useAuth } from "@/contexts/AuthContext"

export function FeedbackPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [expanded, setExpanded] = useState<number | null>(null)
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

        // Determine default attempt ID:
        const savedSelected = localStorage.getItem("selected_result_attempt_id")
        const lastCompleted = localStorage.getItem("viva_last_completed_attempt_id")

        const defaultId = (savedSelected && validList.some(a => String(a.id) === String(savedSelected)))
          ? String(savedSelected)
          : (lastCompleted && validList.some(a => String(a.id) === String(lastCompleted)))
          ? String(lastCompleted)
          : validList[0]?.id ? String(validList[0].id) : ""

        if (defaultId) {
          setSelectedAttemptId(defaultId)
        }
      })
      .catch(() => {})
  }, [user?.rollNumber, user?.id])

  // 2. Fetch specific attempt details & feedback when selectedAttemptId changes
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

  const feedback = result?.feedbackSummary
  const hasFeedback = !!feedback && (
    (feedback.strengths && feedback.strengths.length > 0) ||
    (feedback.improvements && feedback.improvements.length > 0) ||
    (feedback.recommendations && feedback.recommendations.length > 0) ||
    (feedback.topicFeedback && feedback.topicFeedback.length > 0)
  )

  if (loading || !result || !hasFeedback) {
    return (
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Personalized Feedback"
          breadcrumbs={[
            { label: "Dashboard", href: "/student/dashboard" },
            { label: "Results", href: "/student/results" },
            { label: "Feedback" },
          ]}
        />
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <InboxIcon className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">{loading ? "Loading Feedback…" : "No Feedback Available"}</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
            {loading ? "Checking evaluation storage module." : "Personalised feedback will appear here after your viva examination is evaluated."}
          </p>
          <Button onClick={() => navigate("/student/instructions")}>
            Take a Viva <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    )
  }

  const currentFeedback = feedback as FeedbackSummary
  const subjectLine = [result.subject, result.date].filter(Boolean).join(" · ")

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Personalized Feedback"
        description={subjectLine || undefined}
        breadcrumbs={[
          { label: "Dashboard", href: "/student/dashboard" },
          { label: "Results", href: "/student/results" },
          { label: "Feedback" },
        ]}
        actions={
          <div className="flex items-center gap-3 flex-wrap">
            {/* Viva Assessment Selector Dropdown */}
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

            <Button variant="outline" onClick={() => navigate("/student/results")}>
              View Full Results
            </Button>
          </div>
        }
      />

      <div className="grid md:grid-cols-3 gap-5 mb-6">
        {/* Strengths */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="h-full border-green-100 bg-green-50/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-green-700">
                <ThumbsUp className="w-4 h-4" /> Strengths
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {currentFeedback.strengths.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No strengths recorded.</p>
              ) : (
                currentFeedback.strengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Areas for Improvement */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="h-full border-amber-100 bg-amber-50/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
                <TrendingUp className="w-4 h-4" /> Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {currentFeedback.improvements.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No specific improvement areas flagged.</p>
              ) : (
                currentFeedback.improvements.map((imp, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>{imp}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recommendations */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="h-full border-blue-100 bg-blue-50/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
                <BookMarked className="w-4 h-4" /> Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {currentFeedback.recommendations.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No general recommendations.</p>
              ) : (
                currentFeedback.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                    <Star className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Topic-by-topic AI feedback list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            Topic-by-Topic AI Examiner Comments ({result.answers.length} Questions)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {result.answers.map((item, idx) => {
            const isExpanded = expanded === idx
            return (
              <div key={idx} className="border rounded-lg p-4 bg-white shadow-sm space-y-3">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpanded(isExpanded ? null : idx)}
                >
                  <div className="flex items-center gap-2.5">
                    <Badge variant="outline" className="text-xs font-mono">Q{idx + 1}</Badge>
                    <p className="text-sm font-bold text-slate-900">{item.questionText}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={item.score >= 8 ? "success" : item.score >= 5 ? "warning" : "destructive"}
                      className="text-xs"
                    >
                      {item.score * 10}% Score
                    </Badge>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border leading-relaxed">
                  💬 <strong>Examiner Feedback:</strong> {item.feedback}
                </p>

                {isExpanded && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 pt-2 border-t text-xs">
                    <div>
                      <p className="font-semibold text-slate-700">Expected Concepts:</p>
                      <p className="text-slate-600 italic bg-slate-50 p-2 rounded">{item.expectedAnswer || "Standard technical response expected."}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700">Your Spoken / Typed Answer:</p>
                      <p className="text-slate-800 bg-blue-50/50 p-2 rounded border border-blue-100">{item.studentAnswer || "No answer recorded."}</p>
                    </div>
                  </motion.div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
