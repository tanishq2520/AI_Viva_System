// src/pages/student/VivaInstructions.tsx
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Mic2, Clock, Globe, Shield, CheckCircle, AlertTriangle,
  ChevronRight, BookOpen, Volume2, Wifi, Camera, VideoOff
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { PageHeader } from "@/components/common/PageHeader"
import { useState, useRef, useEffect } from "react"
import { getActiveBankQuestions } from "@/services/questionBank"
import { useAuth } from "@/contexts/AuthContext"
import { fetchStudentAttempts } from "@/services/api"

const rules = [
  "Ensure you are in a quiet environment with minimal background noise before starting.",
  "Allow browser microphone access when prompted. The examination cannot proceed without it.",
  "Each question has a time limit. Answer within the allocated time to avoid auto-submission.",
  "Speak clearly and at a moderate pace. The AI transcribes your responses in real time.",
  "Do not refresh the page or navigate away during the examination — session will be flagged.",
  "You may pause briefly between thoughts, but avoid extended silence (>30 seconds).",
  "Each question can be answered only once. Review carefully before submitting.",
  "Technical issues must be reported within 24 hours of the examination via the support portal.",
]

const languages = [
  { code: "EN", name: "English", native: "English" },
  { code: "HI", name: "Hindi", native: "हिन्दी" },
  { code: "TA", name: "Tamil", native: "தமிழ்" },
  { code: "TE", name: "Telugu", native: "తెలుగు" },
  { code: "KN", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ML", name: "Malayalam", native: "മലയാളം" },
  { code: "MR", name: "Marathi", native: "मराठी" },
  { code: "BN", name: "Bengali", native: "বাংলা" },
]

const checklist = [
  { id: "mic", label: "Microphone connected and working" },
  { id: "camera", label: "Camera connected and working" },
  { id: "quiet", label: "In a quiet environment" },
  { id: "browser", label: "Using a supported browser (Chrome, Firefox, Edge)" },
  { id: "internet", label: "Stable internet connection" },
  { id: "rules", label: "Read and understood all examination rules" },
]

export function VivaInstructions() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const allChecked = checklist.every((item) => checked[item.id])
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [alreadyAttempted, setAlreadyAttempted] = useState(false)

  const selectedSubject = localStorage.getItem("selected_viva_subject") || ""
  const selectedTitle = localStorage.getItem("selected_viva_title") || ""

  const activeBank = getActiveBankQuestions()
  const filteredBank = selectedSubject
    ? activeBank.filter((q) => q.subject.toLowerCase() === selectedSubject.toLowerCase())
    : activeBank

  const displayQuestions = filteredBank.length > 0 ? filteredBank : activeBank
  const activeSubject = selectedTitle || (displayQuestions[0]?.subject ? `${displayQuestions[0].subject} Examination` : "Viva Examination")

  useEffect(() => {
    const studentId = user?.rollNumber ?? user?.id
    if (studentId) {
      fetchStudentAttempts(studentId).then((attempts) => {
        if (attempts && Array.isArray(attempts)) {
          const target = activeSubject.toLowerCase().trim()
          const isDone = attempts.some((a: any) => {
            const aSubj = (a.subject || "").toLowerCase().trim()
            return aSubj.includes(target) || target.includes(aSubj)
          })
          if (isDone) {
            setAlreadyAttempted(true)
          }
        }
      }).catch(() => {})
    }
  }, [user, activeSubject])

  useEffect(() => {
    async function setupPreviewCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setIsCameraActive(true)
          setChecked((c) => ({ ...c, camera: true })) // Auto check
        }
      } catch (err) {
        console.error("Camera preview failed", err)
      }
    }
    setupPreviewCamera()

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach(track => track.stop())
        videoRef.current.srcObject = null
      }
    }
  }, [])
  const questionCount = displayQuestions.length || 5
  const durationMins = Math.max(5, Math.round(displayQuestions.reduce((s, q) => s + (q.timeLimit || 120), 0) / 60))

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Examination Instructions"
        description={`${activeSubject} · ${questionCount} Questions · ${durationMins} Minutes`}
        breadcrumbs={[
          { label: "Dashboard", href: "/student/dashboard" },
          { label: "Viva Instructions" },
        ]}
      />

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {[
          { icon: Clock, label: "Duration", value: "30 Minutes", color: "text-blue-600", bg: "bg-blue-50" },
          { icon: Mic2, label: "Format", value: "Voice Response", color: "text-purple-600", bg: "bg-purple-50" },
          { icon: Globe, label: "Language", value: "8 Supported", color: "text-green-600", bg: "bg-green-50" },
        ].map((item, i) => {
          const Icon = item.icon
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.bg}`}>
                    <Icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-semibold">{item.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Rules */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-600" />
              Rules & Regulations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {rules.map((rule, i) => (
              <div key={i} className="flex gap-2.5 text-sm">
                <span className="w-4 h-4 bg-slate-100 rounded-full flex items-center justify-center text-xs font-medium text-slate-600 flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-slate-600 leading-relaxed">{rule}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Supported Languages */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4 text-green-600" />
                Supported Languages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {languages.map((lang) => (
                  <div key={lang.code} className="flex items-center gap-2 p-2 bg-slate-50 rounded-md">
                    <Badge variant="outline" className="text-xs px-1.5 font-mono">
                      {lang.code}
                    </Badge>
                    <div>
                      <p className="text-xs font-medium">{lang.name}</p>
                      <p className="text-xs text-muted-foreground">{lang.native}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Technical Requirements */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Wifi className="w-4 h-4 text-blue-600" />
                Technical Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { icon: Volume2, text: "Working microphone (built-in or external)" },
                { icon: Wifi, text: "Stable broadband connection (5+ Mbps)" },
                { icon: BookOpen, text: "Modern browser: Chrome 90+, Firefox 85+, Edge 90+" },
              ].map((req, i) => {
                const Icon = req.icon
                return (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    {req.text}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Camera Preview */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="w-4 h-4 text-purple-600" />
            Camera Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-900 rounded-lg overflow-hidden relative border flex items-center justify-center max-w-md mx-auto aspect-video">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover ${!isCameraActive && "hidden"}`} 
            />
            {!isCameraActive && (
              <div className="flex flex-col items-center justify-center text-white/50">
                  <VideoOff className="w-6 h-6 mb-2" />
                  <p className="text-xs">Connecting to camera...</p>
              </div>
            )}
            <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 backdrop-blur text-white text-[10px] font-medium px-2 py-1 rounded">
              <span className={`w-1.5 h-1.5 rounded-full ${isCameraActive ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
              PREVIEW
            </div>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-3">
            Please ensure your face is clearly visible and well-lit.
          </p>
        </CardContent>
      </Card>

      {/* Pre-exam checklist */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            Pre-Examination Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3">
            {checklist.map((item) => (
              <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => setChecked((c) => ({ ...c, [item.id]: !c[item.id] }))}
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    checked[item.id]
                      ? "bg-green-600 border-green-600"
                      : "border-slate-300 group-hover:border-green-400"
                  }`}
                >
                  {checked[item.id] && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-slate-700">{item.label}</span>
              </label>
            ))}
          </div>

          {!allChecked && (
            <div className="flex items-center gap-2 mt-4 p-3 bg-amber-50 border border-amber-100 rounded-md text-xs text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              Please check all items before proceeding to the examination.
            </div>
          )}
        </CardContent>
      </Card>

      {alreadyAttempted && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-900">Examination Already Completed</p>
                <p className="text-xs text-red-700 mt-0.5">
                  You have already completed and submitted your viva examination for <strong>{activeSubject}</strong>. Multiple attempts are disabled.
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => navigate("/student/results")} className="bg-red-600 hover:bg-red-700 text-white flex-shrink-0">
              View Results
            </Button>
          </CardContent>
        </Card>
      )}

      <Separator className="mb-6" />

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate("/student/dashboard")}>
          Return to Dashboard
        </Button>
        <Button
          size="lg"
          disabled={!allChecked || alreadyAttempted}
          onClick={() => !alreadyAttempted && navigate("/student/viva")}
          className={alreadyAttempted ? "bg-slate-300 text-slate-600 border-slate-300 cursor-not-allowed" : ""}
        >
          {alreadyAttempted ? "Exam Already Completed" : "Start Examination"} <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
