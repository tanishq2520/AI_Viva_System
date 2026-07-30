// src/pages/student/VivaCompletion.tsx
import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { CheckCircle, Clock, BookOpen, BarChart3, ArrowRight, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { fetchLatestResult, type VivaResult } from "@/services/api"

export function VivaCompletion() {
  const navigate = useNavigate()
  const [result, setResult] = useState<VivaResult | null>(null)

  useEffect(() => {
    fetchLatestResult().then(setResult).catch(() => setResult(null))
  }, [])

  return (
    <div className="max-w-2xl mx-auto py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-20 h-20 bg-green-50 border-4 border-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="w-10 h-10 text-green-600" />
        </motion.div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Examination Completed!</h1>
        <p className="text-muted-foreground max-w-sm mx-auto">
          Your viva responses have been recorded and submitted successfully for AI evaluation.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="mb-5">
          <CardContent className="p-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Submission Summary
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Subject", value: result?.subject ?? "Data Structures & Algorithms" },
                { label: "Student ID", value: result?.studentId ?? "CS21B045" },
                { label: "Questions Answered", value: result ? `${result.attempted} / ${result.totalQuestions}` : "—" },
                { label: "Duration", value: result?.duration ?? "—" },
                { label: "Submission Time", value: new Date().toLocaleTimeString() },
                { label: "Session ID", value: result ? `VS-${String(result.id).padStart(4, "0")}` : "—" },
              ].map((item) => (
                <div key={item.label} className="border-b pb-3">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-5 border-blue-100 bg-blue-50">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">Results Expected Within</p>
              <p className="text-xs text-blue-700">
                Your AI-evaluated result has been stored and is ready to view.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate("/student/dashboard")}
          >
            Back to Dashboard
          </Button>
          <Button className="flex-1" onClick={() => navigate("/student/results")}>
            View Results <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <Separator className="my-5" />

        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: BarChart3, label: "View Analytics", href: "/student/results" },
            { icon: BookOpen, label: "Get Feedback", href: "/student/feedback" },
            { icon: Download, label: "Download Receipt", href: "#" },
          ].map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.label}
                onClick={() => action.href !== "#" && navigate(action.href)}
                className="p-3 border rounded-lg hover:bg-slate-50 transition-colors flex flex-col items-center gap-1.5"
              >
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{action.label}</span>
              </button>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
