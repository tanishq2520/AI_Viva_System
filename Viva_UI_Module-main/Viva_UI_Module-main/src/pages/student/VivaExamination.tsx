// src/pages/student/VivaExamination.tsx
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Mic, MicOff, Square, ChevronLeft, ChevronRight, Send,
  Clock, CheckCircle2, Circle, AlertTriangle, Loader2,
  InboxIcon, Camera, VideoOff, Volume2, VolumeX, ShieldAlert, ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useTimer } from "@/hooks/useTimer"
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder"
import { useSpeechQuestion } from "@/hooks/useSpeechQuestion"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { demoQuestions, fetchQuestions, submitAttempt, type VivaQuestion } from "@/services/api"
import { useAuth } from "@/contexts/AuthContext"
import { getActiveBankQuestions, type BankQuestion } from "@/services/questionBank"

function getQuestionsForSubject(): BankQuestion[] {
  try {
    const selectedSubject = (localStorage.getItem("selected_viva_subject") || "").toLowerCase().trim()
    const active = getActiveBankQuestions()
    if (!selectedSubject) return active

    const target = selectedSubject.replace("examination", "").trim()

    const matched = active.filter((q) => {
      const qSubj = (q.subject || "").toLowerCase().replace("examination", "").trim()
      return qSubj === target || qSubj.includes(target) || target.includes(qSubj)
    })

    return matched.length > 0 ? matched : active
  } catch {
    return getActiveBankQuestions()
  }
}

function loadBankQuestions(): VivaQuestion[] {
  try {
    const list = getQuestionsForSubject()
    if (!list || list.length === 0) return []
    return list.map((q, idx) => ({
      id: idx + 1,
      question: q.question,
      category: q.category || q.subject,
      difficulty: q.difficulty || "Medium",
      expectedKeywords: (q.answer || "")
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 3)
        .slice(0, 8),
      timeLimit: q.timeLimit ?? 120,
      sampleTranscript: "",
    }))
  } catch {
    return []
  }
}

function getBankAnswer(idx: number): string {
  try {
    const list = getQuestionsForSubject()
    return list[idx]?.answer ?? ""
  } catch {
    return ""
  }
}

function getBankSubject(): string {
  try {
    const selectedTitle = localStorage.getItem("selected_viva_title")
    if (selectedTitle) return selectedTitle
    const selectedSubject = localStorage.getItem("selected_viva_subject")
    if (selectedSubject) return `${selectedSubject} Examination`

    const active = getActiveBankQuestions()
    const subjects = [...new Set(active.map((q) => q.subject).filter(Boolean))]
    return subjects.join(" & ") || "Viva Examination"
  } catch {
    return "Viva Examination"
  }
}

export function VivaExamination() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [currentQ, setCurrentQ] = useState(0)
  const [questions, setQuestions] = useState<VivaQuestion[]>([])
  const [usingBankQuestions, setUsingBankQuestions] = useState(false)
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set())
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [suspiciousWarning, setSuspiciousWarning] = useState<string | null>(null)

  const initialTime = parseInt(localStorage.getItem("viva_time_limit") || "1800")

  const examTimer = useTimer({
    initialSeconds: initialTime,
    autoStart: questions.length > 0,
    countdown: true,
  })

  const safeQIndex = Math.max(0, Math.min(currentQ, Math.max(0, questions.length - 1)))
  const question = questions[safeQIndex] || questions[0] || demoQuestions[0]

  const qTimer = useTimer({
    initialSeconds: question?.timeLimit ?? 120,
    autoStart: false,
    countdown: true,
  })

  const recorder = useVoiceRecorder()
  const speech = useSpeechQuestion()
  const recognition = useSpeechRecognition()

  // ── Load questions: backend first, then demo fallback ───────────────────
  useEffect(() => {
    fetchQuestions()
      .then((items) => {
        if (items && items.length > 0) {
          setQuestions(items)
        } else {
          throw new Error("No questions returned")
        }
      })
      .catch((err) => {
        console.error("fetchQuestions error:", err)
        setLoadError("Could not connect to backend. Using built-in demo questions.")
        setQuestions(demoQuestions)
      })
  }, [])

  // ── Camera setup & cleanup ───────────────────────────────────────────────
  function stopCamera() {
    try {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
        videoRef.current.srcObject = null
      }
    } catch {}
    setIsCameraActive(false)
  }

  useEffect(() => {
    let mounted = true
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (mounted && videoRef.current) {
          videoRef.current.srcObject = stream
          setIsCameraActive(true)
        }
      } catch (err) {
        console.error("Error accessing camera", err)
      }
    }
    setupCamera()

    return () => {
      mounted = false
      stopCamera()
      localStorage.removeItem("viva_active_session")
    }
  }, [])

  // ── Auto-speak question when it changes ───────────────────────────────────
  useEffect(() => {
    if (question?.question) {
      const t = setTimeout(() => speech.speak(question.question), 400)
      return () => clearTimeout(t)
    }
  }, [safeQIndex, question?.question])

  // ── Listen for real-time faculty proctor flags ─────────────────────────────
  useEffect(() => {
    const checkFacultyFlag = () => {
      try {
        const flagRaw = localStorage.getItem("viva_suspicious_flag")
        if (flagRaw) {
          const flag = JSON.parse(flagRaw)
          if (Date.now() - (flag.timestamp || 0) < 180000) {
            setSuspiciousWarning(`⚠️ PROCTOR WARNING: ${flag.reason}`)
          }
        }
      } catch (e) {}
    }

    checkFacultyFlag()
    const interval = setInterval(checkFacultyFlag, 1500)
    return () => clearInterval(interval)
  }, [])

  // ── Sync live speech recognition transcript into answers ──────────────────
  useEffect(() => {
    if (question && (recognition.transcript || recognition.interimTranscript)) {
      const combined = recognition.interimTranscript
        ? recognition.transcript + " " + recognition.interimTranscript
        : recognition.transcript
      setAnswers((prev) => ({ ...prev, [question.id]: combined.trim() }))
    }
  }, [recognition.transcript, recognition.interimTranscript, question?.id])

  // ── Broadcast live session telemetry for Faculty Live Monitoring ─────────────
  const examStateRef = useRef<any>({})
  examStateRef.current = {
    safeQIndex,
    question,
    questionsLength: questions.length,
    transcript: recognition.transcript,
    interimTranscript: recognition.interimTranscript,
    isRecording: recorder.isRecording,
    isListening: recognition.isListening,
    seconds: examTimer.seconds,
    user,
    answers,
    initialTime,
  }

  useEffect(() => {
    const broadcastTelemetry = () => {
      const st = examStateRef.current
      if (!st.question) return
      const currentTranscript = (
        st.transcript + (st.interimTranscript ? " " + st.interimTranscript : "")
      ).trim() || st.answers[st.question.id] || ""

      const status = st.isRecording || st.isListening
        ? "recording"
        : st.answers[st.question.id]
        ? "answering"
        : "thinking"

      const elapsed = Math.max(0, st.initialTime - st.seconds)
      const mins = Math.floor(elapsed / 60)
      const secs = elapsed % 60

      const liveSessionData = {
        id: `live-${st.user?.id ?? "student"}`,
        student: st.user?.name ?? "Akash",
        rollNumber: st.user?.rollNumber ?? st.user?.id ?? "CS21B04",
        subject: getBankSubject(),
        currentQuestion: st.safeQIndex + 1,
        totalQuestions: st.questionsLength,
        elapsedTime: `${mins}m ${secs < 10 ? '0' : ''}${secs}s`,
        currentScore: Math.round(((st.safeQIndex) / (st.questionsLength || 1)) * 75 + 15),
        status: status,
        lastTranscript: currentTranscript || "Student is currently reviewing the question.",
        lastUpdated: Date.now(),
      }

      localStorage.setItem("viva_active_session", JSON.stringify(liveSessionData))
    }

    broadcastTelemetry()
    const interval = setInterval(broadcastTelemetry, 1000)
    return () => clearInterval(interval)
  }, [])

  // ── Recording controls ────────────────────────────────────────────────────
  function handleStartRecording() {
    recorder.startRecording()
    recognition.reset()
    recognition.start()
    qTimer.start()
    speech.cancel()
  }

  function handleStopRecording() {
    recorder.stopRecording()
    recognition.stop()
    qTimer.stop()
  }

  function handleSubmitAnswer() {
    recorder.stopRecording()
    recognition.stop()
    qTimer.stop()
    if (question && recognition.transcript && !answers[question.id]) {
      setAnswers((prev) => ({ ...prev, [question.id]: recognition.transcript }))
    }
    setAnsweredQuestions((prev) => new Set([...prev, safeQIndex]))
    recorder.resetRecording()
    recognition.reset()
    if (safeQIndex < questions.length - 1) {
      setCurrentQ(safeQIndex + 1)
      qTimer.reset()
    }
  }

  function handleNext() {
    if (safeQIndex < questions.length - 1) {
      recorder.resetRecording()
      recognition.stop()
      setCurrentQ(safeQIndex + 1)
      qTimer.reset()
    }
  }

  function handlePrev() {
    if (safeQIndex > 0) {
      recorder.resetRecording()
      recognition.stop()
      setCurrentQ(safeQIndex - 1)
      qTimer.reset()
    }
  }

  // ── Final submit ──────────────────────────────────────────────────────────
  async function handleFinalSubmit() {
    setSubmitting(true)
    speech.cancel()
    recognition.stop()

    const subjectName = getBankSubject()

    try {
      const res = await submitAttempt({
        studentId: user?.rollNumber ?? user?.id ?? "CS21B04",
        studentName: user?.name ?? "Akash",
        subject: subjectName,
        durationSeconds: Math.max(0, initialTime - examTimer.seconds),
        answers: questions.map((item, idx) => ({
          questionId: item.id,
          answer: answers[item.id] ?? "",
          questionText: item.question,
          category: item.category,
          expectedAnswer: usingBankQuestions ? getBankAnswer(idx) : undefined,
        })),
      })
      if (res?.id) {
        localStorage.setItem("viva_last_completed_attempt_id", String(res.id))
      }
      stopCamera()
      localStorage.removeItem("viva_active_session")
      navigate("/student/completion")
    } catch (error) {
      setLoadError("Could not save attempt. Navigating to completion...")
      stopCamera()
      localStorage.removeItem("viva_active_session")
      setTimeout(() => navigate("/student/completion"), 1000)
    }
  }

  const currentTranscript = question
    ? (recognition.isListening
        ? (recognition.transcript + (recognition.interimTranscript ? " " + recognition.interimTranscript : "")).trim()
        : (answers[question.id] ?? ""))
    : ""

  const progress = Math.round((answeredQuestions.size / Math.max(1, questions.length)) * 100)
  const timerWarning = examTimer.seconds < 300

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Real-time Proctor Warning Alert */}
      {suspiciousWarning && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-600 text-white rounded-lg flex items-center justify-between shadow-lg"
        >
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 flex-shrink-0 animate-bounce" />
            <div>
              <p className="font-bold text-sm">FACULTY PROCTOR WARNING</p>
              <p className="text-xs opacity-90">{suspiciousWarning}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSuspiciousWarning(null)}
            className="text-xs bg-white/20 border-white/40 text-white hover:bg-white/30"
          >
            Acknowledge
          </Button>
        </motion.div>
      )}

      {/* Exam header bar */}
      <div className="flex items-center justify-between p-3.5 bg-slate-900 rounded-lg text-white shadow">
        <div>
          <p className="text-base font-bold text-blue-400">{getBankSubject()}</p>
          <p className="text-xs text-slate-300">
            Student: <span className="font-semibold text-white">{user?.name ?? "Akash"}</span> ({user?.rollNumber ?? user?.id ?? "CS21B04"})
          </p>
          {loadError && <p className="text-xs text-amber-300 mt-1">{loadError}</p>}
        </div>
        <div className="flex items-center gap-4">
          <button
            title={speech.isSpeaking ? "Stop speaking" : "Read question aloud"}
            onClick={() => speech.isSpeaking ? speech.cancel() : (question && speech.speak(question.question))}
            className="text-white/70 hover:text-white transition-colors"
          >
            {speech.isSpeaking ? <VolumeX className="w-5 h-5 text-blue-400 animate-pulse" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <div className={`flex items-center gap-1.5 text-sm font-mono font-bold ${timerWarning ? "text-red-400 animate-pulse" : "text-emerald-400"}`}>
            <Clock className="w-4 h-4" />
            {examTimer.formatted}
          </div>
          <Badge variant="info" className="text-xs font-mono">
            {answeredQuestions.size}/{questions.length} Answered
          </Badge>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
            onClick={() => setShowSubmitConfirm(true)}
          >
            Submit Examination
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Overall Exam Progress</span>
          <span className="font-semibold text-blue-600">{progress}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question navigation dots */}
      <div className="flex flex-wrap gap-2">
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              recorder.resetRecording()
              recognition.stop()
              setCurrentQ(i)
              qTimer.reset()
            }}
            className={`w-8 h-8 rounded-full text-xs font-bold border-2 transition-all ${
              i === safeQIndex
                ? "bg-blue-600 border-blue-600 text-white shadow-sm scale-105"
                : answeredQuestions.has(i)
                ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-semibold"
                : "bg-white border-slate-200 text-slate-600 hover:border-blue-300"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-5 gap-5">
        {/* Question panel */}
        <div className="md:col-span-3 space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={safeQIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="border-2 border-slate-200 shadow-sm">
                <CardHeader className="pb-3 border-b bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-bold bg-white">
                        Question {safeQIndex + 1} of {questions.length}
                      </Badge>
                      <Badge
                        variant={
                          question.difficulty === "Hard" ? "destructive" :
                          question.difficulty === "Easy" ? "success" : "warning"
                        }
                        className="text-xs font-semibold"
                      >
                        {question.difficulty}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => speech.isSpeaking ? speech.cancel() : speech.speak(question.question)}
                        className={`p-1 rounded transition-colors ${speech.isSpeaking ? "text-blue-600 bg-blue-100" : "text-slate-500 hover:text-blue-600"}`}
                        title="Read question aloud"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <div className={`flex items-center gap-1 text-xs font-mono font-bold ${qTimer.seconds < 30 && qTimer.isRunning ? "text-red-500 animate-pulse" : "text-slate-600"}`}>
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        {qTimer.formatted}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  <p className="text-xs font-bold uppercase text-blue-600 tracking-wide mb-1.5">{question.category}</p>
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    {question.question}
                  </h3>
                  {answeredQuestions.has(safeQIndex) && (
                    <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-md">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      Answer recorded for Question {safeQIndex + 1}.
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Voice recorder + speech recognition */}
          <Card className="border-2 border-slate-200 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Mic className="w-4 h-4 text-blue-600" /> Spoken Voice Response
                </p>
                {recognition.isListening && (
                  <span className="flex items-center gap-1.5 text-xs text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded border border-red-200 animate-pulse">
                    <span className="w-2 h-2 bg-red-500 rounded-full" /> Recording Answer Live…
                  </span>
                )}
              </div>

              {/* Spoken Live Transcript Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-md p-3.5 min-h-24 shadow-inner">
                {currentTranscript ? (
                  <p className="text-sm font-medium text-slate-900 leading-relaxed">
                    "{currentTranscript}"
                  </p>
                ) : (
                  <p className="text-sm text-slate-400 italic">
                    Click <strong>"Start Recording Answer"</strong> below and speak clearly into your microphone…
                  </p>
                )}
              </div>

              {/* Text Edit Backup */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                  Edit or Type Response Text (Optional Backup)
                </label>
                <textarea
                  value={answers[question.id] ?? ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
                  placeholder="Type or edit your spoken response here…"
                  className="w-full text-xs p-2.5 border rounded-md min-h-16 resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Recording Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  {!recognition.isListening ? (
                    <Button
                      onClick={handleStartRecording}
                      className="bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs font-semibold shadow-sm"
                    >
                      <Mic className="w-4 h-4" /> Start Recording Answer
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      onClick={handleStopRecording}
                      className="gap-2 text-xs font-semibold shadow-sm"
                    >
                      <Square className="w-4 h-4" /> Stop Recording
                    </Button>
                  )}
                </div>

                <Button
                  onClick={handleSubmitAnswer}
                  variant="outline"
                  className="gap-1.5 text-xs font-semibold border-slate-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-600" /> Save Question Answer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Proctoring WebCam Feed & Nav Sidebar */}
        <div className="md:col-span-2 space-y-4">
          <Card className="border-2 border-slate-200 overflow-hidden shadow-sm">
            <CardHeader className="pb-2 bg-slate-900 text-white">
              <CardTitle className="text-xs font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-blue-400" /> Live WebCam Feed
                </span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                  <span className={`w-2 h-2 rounded-full ${isCameraActive ? "bg-emerald-500 animate-ping" : "bg-red-500"}`} />
                  {isCameraActive ? "PROCTORING ACTIVE" : "OFFLINE"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 bg-slate-950">
              <div className="relative aspect-video bg-black rounded-md overflow-hidden flex items-center justify-center border border-slate-800">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${!isCameraActive && "hidden"}`}
                />
                {!isCameraActive && (
                  <div className="flex flex-col items-center justify-center text-slate-500">
                    <VideoOff className="w-8 h-8 mb-2" />
                    <p className="text-xs">Camera Offline</p>
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-white text-[10px] font-mono">
                  PROCTOR ID: VS-2026
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation Controls */}
          <Card className="border-2 border-slate-200 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  disabled={safeQIndex === 0}
                  className="gap-1 text-xs"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={safeQIndex >= questions.length - 1}
                  className="gap-1 text-xs"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <Button
                onClick={() => setShowSubmitConfirm(true)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 shadow"
              >
                Submit Examination ({answeredQuestions.size}/{questions.length} Answered)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Submit Viva Examination?</h3>
                <p className="text-xs text-slate-600">
                  You have answered <strong>{answeredQuestions.size}</strong> out of <strong>{questions.length}</strong> questions.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded border">
              Once submitted, your answers will be evaluated by the AI scoring module and stored in your student record.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSubmitConfirm(false)}
                disabled={submitting}
                className="text-xs"
              >
                Continue Answering
              </Button>
              <Button
                size="sm"
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm Submission"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
