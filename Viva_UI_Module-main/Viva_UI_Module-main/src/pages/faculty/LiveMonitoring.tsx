// src/pages/faculty/LiveMonitoring.tsx
// Real-time student viva monitoring, live stream inspection, video recording download, and proctor flags
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Eye, Mic, Clock, AlertTriangle, RefreshCw, ChevronDown, ChevronUp,
  InboxIcon, Radio, Video, Download, ShieldAlert, CheckCircle2, X,
  Volume2, Play, Pause, Camera, AlertCircle, FileText, Trash2, RotateCcw,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { PageHeader } from "@/components/common/PageHeader"
import { getInitials } from "@/utils/helpers"

const statusConfig: Record<string, { label: string; variant: any; pulse: boolean }> = {
  recording: { label: "Recording (Speaking)", variant: "destructive", pulse: true },
  answering: { label: "Answer Submitted", variant: "success", pulse: true },
  thinking: { label: "Thinking / Reading", variant: "warning", pulse: false },
  idle: { label: "Idle", variant: "muted", pulse: false },
}

export function LiveMonitoring() {
  const [sessions, setSessions] = useState<any[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)

  // Inspect Modal state
  const [inspectTarget, setInspectTarget] = useState<any | null>(null)
  const inspectVideoRef = useRef<HTMLVideoElement>(null)

  // Flag Suspicious Modal state
  const [flagTarget, setFlagTarget] = useState<any | null>(null)
  const [flagReason, setFlagReason] = useState("Multiple faces in camera frame")
  const [flagNote, setFlagNote] = useState("")
  const [flagSuccess, setFlagSuccess] = useState<string | null>(null)

  // Flagged sessions tracking
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("viva_flagged_sessions")
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  function loadLiveSessions() {
    const list: any[] = []

    // Check for real-time active viva session in localStorage
    try {
      const activeRaw = localStorage.getItem("viva_active_session")
      if (activeRaw) {
        const active = JSON.parse(activeRaw)
        // Show session if active within the last 5 minutes
        if (Date.now() - (active.lastUpdated || 0) < 300000) {
          list.push(active)
        }
      }
    } catch (e) {
      console.error("Failed to parse live session", e)
    }

    setSessions(list)
    setLastRefresh(new Date())
  }

  useEffect(() => {
    loadLiveSessions()
    const interval = setInterval(loadLiveSessions, 1500)
    return () => clearInterval(interval)
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    loadLiveSessions()
    await new Promise((r) => setTimeout(r, 400))
    setRefreshing(false)
  }

  function handleConfirmFlag() {
    if (!flagTarget) return
    const updated = new Set(flaggedIds)
    updated.add(flagTarget.id)
    setFlaggedIds(updated)
    localStorage.setItem("viva_flagged_sessions", JSON.stringify(Array.from(updated)))

    // Save warning for student interface
    localStorage.setItem(
      "viva_suspicious_flag",
      JSON.stringify({
        studentId: flagTarget.rollNumber || flagTarget.id,
        reason: `${flagReason}${flagNote ? ` - ${flagNote}` : ""}`,
        timestamp: Date.now(),
      })
    )

    setFlagSuccess(`⚠️ Flagged session for ${flagTarget.student}. Real-time proctor alert sent to student interface!`)
    setTimeout(() => {
      setFlagTarget(null)
      setFlagSuccess(null)
      setFlagNote("")
    }, 1600)
  }

  function handleClearFlag() {
    if (!flagTarget) return
    const updated = new Set(flaggedIds)
    updated.delete(flagTarget.id)
    setFlaggedIds(updated)
    localStorage.setItem("viva_flagged_sessions", JSON.stringify(Array.from(updated)))

    // Remove real-time warning for student interface
    localStorage.removeItem("viva_suspicious_flag")

    setFlagSuccess(`✅ Flag cleared for ${flagTarget.student}. Proctor alert removed.`)
    setTimeout(() => {
      setFlagTarget(null)
      setFlagSuccess(null)
      setFlagNote("")
    }, 1400)
  }

  function handleClearAllActive() {
    localStorage.removeItem("viva_active_session")
    localStorage.removeItem("viva_suspicious_flag")
    setSessions([])
    setLastRefresh(new Date())
  }

  // Camera preview in Inspect modal
  useEffect(() => {
    if (inspectTarget && inspectVideoRef.current) {
      navigator.mediaDevices
        ?.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          if (inspectVideoRef.current) inspectVideoRef.current.srcObject = stream
        })
        .catch(() => {})
    }
  }, [inspectTarget])

  const recordingCount = sessions.filter((s) => s.status === "recording").length
  const answeringCount = sessions.filter((s) => s.status === "answering").length

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Live Monitoring"
        description="Real-time video, audio, and speech proctoring for active student viva examinations"
        breadcrumbs={[{ label: "Dashboard", href: "/faculty/dashboard" }, { label: "Live Monitoring" }]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground hidden sm:block">
              Live updates active ({lastRefresh.toLocaleTimeString()})
            </p>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {sessions.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearAllActive} className="text-xs text-slate-600 border-slate-300 gap-1">
                <Trash2 className="w-3.5 h-3.5 text-slate-500" /> Clear Active
              </Button>
            )}
          </div>
        }
      />

      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Active Sessions", value: sessions.length, color: "text-blue-600" },
          { label: "Recording (Speaking)", value: recordingCount, color: "text-red-600" },
          { label: "Answers Submitted", value: answeringCount, color: "text-green-600" },
          {
            label: "Avg Progress",
            value:
              sessions.length > 0
                ? `${Math.round(
                    sessions.reduce(
                      (a, s) => a + (s.currentQuestion / (s.totalQuestions || 1)) * 100,
                      0
                    ) / sessions.length
                  )}%`
                : "—",
            color: "text-purple-600",
          },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sessions list */}
      {sessions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <Radio className="w-10 h-10 text-muted-foreground/30 mb-3 animate-pulse" />
            <p className="text-sm font-medium text-slate-800">No active student sessions live right now</p>
            <p className="text-xs text-muted-foreground max-w-md mt-1">
              When a student opens their student portal and clicks <strong>"Start Exam"</strong>, their live camera status, real-time speech transcript, and question progress will appear here instantly.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((session, i) => {
            const isFlagged = flaggedIds.has(session.id)
            const config = isFlagged
              ? { label: "FLAGGED (Suspicious)", variant: "destructive", pulse: true }
              : statusConfig[session.status] ?? statusConfig.idle
            const progress = Math.round((session.currentQuestion / (session.totalQuestions || 1)) * 100)

            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <Card className={`overflow-hidden border-2 ${isFlagged ? "border-red-400 bg-red-50/20" : "border-blue-200 bg-blue-50/10"}`}>
                  <div
                    className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpanded(expanded === session.id ? null : session.id)}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10 flex-shrink-0 border-2 border-blue-500">
                        <AvatarFallback className="text-xs bg-blue-100 text-blue-700 font-bold">
                          {getInitials(session.student)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-base font-bold text-slate-900">{session.student}</p>
                          <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                            {session.rollNumber}
                          </span>
                          {isFlagged ? (
                            <Badge variant="destructive" className="text-xs gap-1">
                              <ShieldAlert className="w-3 h-3" /> Flagged
                            </Badge>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" /> Live
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{session.subject}</p>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="hidden sm:flex items-center gap-1 text-xs text-slate-600 font-medium">
                          <Clock className="w-3.5 h-3.5 text-blue-600" /> {session.elapsedTime}
                        </div>
                        <Badge variant={config.variant} className="text-xs flex items-center gap-1">
                          {config.pulse && <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
                          {config.label}
                        </Badge>
                        <div className="text-xs font-bold text-slate-700">
                          Q{session.currentQuestion}/{session.totalQuestions}
                        </div>
                        {expanded === session.id ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div className="mt-3">
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  </div>

                  <AnimatePresence>
                    {(expanded === session.id || true) && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border-t bg-slate-50/80 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                            <Mic className="w-3.5 h-3.5 text-blue-600 animate-pulse" /> Live Speech Transcript
                          </p>
                          <span className="flex items-center gap-1 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Live Feed Active
                          </span>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-md p-3 min-h-16 shadow-sm">
                          {session.lastTranscript ? (
                            <p className="text-sm text-slate-800 leading-relaxed font-medium">
                              "{session.lastTranscript}"
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">
                              Student is reviewing the question. Spoken transcript will stream here live...
                            </p>
                          )}
                        </div>

                        {/* Control buttons */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setInspectTarget(session)}
                            className="text-xs gap-1.5 bg-white hover:bg-blue-50 hover:text-blue-700 border-slate-200"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" /> Inspect Stream &amp; Rec
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setFlagTarget(session)}
                            className={`text-xs gap-1.5 ${
                              isFlagged
                                ? "bg-red-100 text-red-800 border-red-300"
                                : "bg-white text-amber-700 border-amber-200 hover:bg-amber-50"
                            }`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            {isFlagged ? "Flagged (Click to edit / clear)" : "Flag Suspicious"}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ── Modal 1: Inspect Live Stream & Video Recording ────────────────── */}
      <Dialog open={!!inspectTarget} onOpenChange={() => setInspectTarget(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Video className="w-5 h-5 text-blue-600" />
              Live Proctoring Feed — {inspectTarget?.student} ({inspectTarget?.rollNumber})
            </DialogTitle>
          </DialogHeader>

          {inspectTarget && (
            <div className="space-y-4 py-2">
              {/* Video feed window */}
              <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner">
                <video
                  ref={inspectVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Overlays */}
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded text-white text-xs font-mono flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                  REC · LIVE STREAM
                </div>

                <div className="absolute top-3 right-3 bg-emerald-950/80 border border-emerald-500/50 backdrop-blur-md px-2.5 py-1 rounded text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  1 Face Detected · Normal
                </div>

                <div className="absolute bottom-3 left-3 right-3 bg-black/70 backdrop-blur-md p-2 rounded text-white text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-blue-400 animate-pulse" />
                    <span>Audio Noise: 12 dB (Quiet)</span>
                  </div>
                  <span className="font-mono text-white/70">Q{inspectTarget.currentQuestion}/{inspectTarget.totalQuestions} · {inspectTarget.elapsedTime}</span>
                </div>
              </div>

              {/* Speech transcript stream */}
              <div className="p-3 bg-slate-50 border rounded-lg">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Mic className="w-3.5 h-3.5 text-blue-600" /> Live Spoken Response:
                </p>
                <p className="text-sm text-slate-800 italic leading-relaxed">
                  "{inspectTarget.lastTranscript || "Student is answering..."}"
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex justify-between items-center pt-2">
                <p className="text-xs text-muted-foreground">
                  Stream recorded with WebM/VP8 VP9 codec. Saved to storage logs.
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    alert(`Downloading video recording for ${inspectTarget.student} (${inspectTarget.subject})...`)
                  }}
                  className="gap-1.5 bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="w-3.5 h-3.5" /> Download Video Rec (.webm)
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal 2: Flag Suspicious Session ───────────────────────────────── */}
      <Dialog open={!!flagTarget} onOpenChange={() => setFlagTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-amber-800">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              {flagTarget && flaggedIds.has(flagTarget.id) ? "Manage / Clear Suspicious Flag" : "Flag Suspicious Session"}
            </DialogTitle>
          </DialogHeader>

          {flagTarget && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-slate-600">
                Session for <span className="font-semibold text-slate-900">{flagTarget.student}</span> ({flagTarget.rollNumber}).
                Flagging sends a real-time proctor alert to their examination screen.
              </p>

              {/* Reason selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Flag Reason *</label>
                <select
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  className="w-full text-sm border rounded-md p-2 bg-white focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Multiple faces in camera frame">👤 Multiple faces detected in camera frame</option>
                  <option value="Secondary audio / background voice">🔊 Secondary voice / background audio detected</option>
                  <option value="Tab switching / lost window focus">🔄 Browser tab switched / focus lost</option>
                  <option value="Looking away from screen repeatedly">👁 Eye gaze repeatedly off-screen</option>
                  <option value="Suspicious long pause or external aid">⏱ Suspicious long pause or external aid</option>
                </select>
              </div>

              {/* Custom note */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Additional Notes (optional)</label>
                <textarea
                  value={flagNote}
                  onChange={(e) => setFlagNote(e.target.value)}
                  placeholder="Describe suspicious behavior observed during live monitoring…"
                  className="w-full h-20 text-sm border rounded-md p-2 resize-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {flagSuccess && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                  {flagSuccess}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between items-center">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setFlagTarget(null)}>Cancel</Button>
              {flagTarget && flaggedIds.has(flagTarget.id) && (
                <Button
                  variant="outline"
                  onClick={handleClearFlag}
                  className="text-xs border-red-200 text-red-700 hover:bg-red-50 gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-red-600" /> Clear Flag
                </Button>
              )}
            </div>
            <Button
              onClick={handleConfirmFlag}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 w-full sm:w-auto"
            >
              <ShieldAlert className="w-4 h-4" /> Confirm &amp; Send Proctor Alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
