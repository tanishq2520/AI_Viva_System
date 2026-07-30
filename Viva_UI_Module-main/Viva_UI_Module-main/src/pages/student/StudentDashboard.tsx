// src/pages/student/StudentDashboard.tsx
import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Calendar, Clock, BookOpen, Award, ArrowRight, TrendingUp,
  CheckCircle2, InboxIcon, PlayCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { StatCard } from "@/components/common/StatCard"
import { PageHeader } from "@/components/common/PageHeader"
import { useAuth } from "@/contexts/AuthContext"
import { fetchStudentAttempts } from "@/services/api"
import { formatDate, getInitials } from "@/utils/helpers"
import { getUpcomingSessionsFromBank } from "@/services/questionBank"

const statusColors: Record<string, string> = {
  completed: "success",
  scheduled: "info",
  pending: "warning",
}

export function StudentDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [attempts, setAttempts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [upcomingSessions, setUpcomingSessions] = useState(() => getUpcomingSessionsFromBank())

  useEffect(() => {
    const studentId = user?.rollNumber ?? user?.id
    if (studentId) {
      fetchStudentAttempts(studentId)
        .then((data) => {
          const completedAttempts = data || []
          setAttempts(completedAttempts)

          // Filter out upcoming sessions that student has already completed
          const allSessions = getUpcomingSessionsFromBank()
          const completedSubjects = new Set(
            completedAttempts.map((a: any) => (a.subject || "").toLowerCase().trim())
          )

          const remainingSessions = allSessions.filter((s) => {
            const sessionSubj = s.subject.toLowerCase().trim()
            const rawSubj = s.rawSubject.toLowerCase().trim()
            return !Array.from(completedSubjects).some(
              (c) => c.includes(sessionSubj) || c.includes(rawSubj) || sessionSubj.includes(c) || rawSubj.includes(c)
            )
          })

          setUpcomingSessions(remainingSessions)
        })
        .catch((err) => {
          console.error("Failed to fetch student attempts:", err)
          setUpcomingSessions(getUpcomingSessionsFromBank())
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setUpcomingSessions(getUpcomingSessionsFromBank())
      setLoading(false)
    }
  }, [user?.rollNumber, user?.id])

  const avgScore = attempts.length > 0
    ? attempts.reduce((sum, a) => sum + (Number(a.score) || 0), 0) / attempts.length
    : 0

  const bestGrade = attempts.length > 0
    ? attempts.reduce((best, a) =>
        (Number(a.score) || 0) > (Number(best?.score) || -1) ? a : best, null as any)
    : null

  const greeting = user?.name ? `Welcome back, ${user.name.split(" ")[0]}` : "Welcome"

  function startExam(session: any) {
    localStorage.setItem("selected_viva_subject", session.rawSubject)
    localStorage.setItem("selected_viva_title", session.subject)
    navigate("/student/instructions")
  }

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title={greeting}
        description="Here's your viva examination overview."
      />

      {/* Profile summary */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 p-4 bg-slate-900 rounded-lg text-white mb-6"
      >
        <Avatar className="h-12 w-12 border-2 border-blue-400">
          <AvatarFallback className="bg-blue-600 text-sm">
            {user?.name ? getInitials(user.name) : "—"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold">{user?.name || "Student"}</p>
          <p className="text-white/60 text-sm">
            {user ? [user.rollNumber, user.department, user.semester && `${user.semester} Semester`]
              .filter(Boolean).join(" · ") : "No profile data"}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-6">
          <div className="text-center">
            <p className="text-lg font-bold text-blue-400">
              {avgScore > 0 ? `${avgScore.toFixed(1)}%` : "—"}
            </p>
            <p className="text-xs text-white/50">Avg Score</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-blue-400">{attempts.length}</p>
            <p className="text-xs text-white/50">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-blue-400">
              {user?.gpa && user.gpa > 0 ? user.gpa : "—"}
            </p>
            <p className="text-xs text-white/50">GPA</p>
          </div>
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Upcoming Vivas" value={upcomingSessions.length} icon={Calendar} iconColor="text-blue-600" iconBg="bg-blue-50" index={0} />
        <StatCard title="Completed" value={attempts.length} icon={CheckCircle2} iconColor="text-green-600" iconBg="bg-green-50" index={1} />
        <StatCard
          title="Average Score"
          value={avgScore > 0 ? `${avgScore.toFixed(0)}%` : "—"}
          icon={TrendingUp} iconColor="text-purple-600" iconBg="bg-purple-50" index={2}
        />
        <StatCard
          title="Best Grade"
          value={bestGrade?.grade ?? "—"}
          icon={Award} iconColor="text-amber-600" iconBg="bg-amber-50"
          description={bestGrade?.subject ?? "No attempts yet"}
          index={3}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming sessions */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Upcoming Sessions</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (upcomingSessions.length > 0) startExam(upcomingSessions[0])
                else navigate("/student/instructions")
              }}
              className="text-xs"
            >
              View All <ArrowRight className="w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <InboxIcon className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No upcoming sessions</p>
                <p className="text-xs text-muted-foreground mt-0.5">All assigned viva examinations have been completed!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingSessions.map((session, i) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-start justify-between p-3 border rounded-md hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-md flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{session.subject}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(session.date)} · {session.totalQuestions} Questions · {session.duration}
                        </p>
                        <p className="text-xs text-muted-foreground">{session.examiner}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge variant={statusColors[session.status] as any}>{session.status}</Badge>
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700"
                        onClick={() => startExam(session)}
                      >
                        <PlayCircle className="w-3 h-3" /> Start Exam
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Previous attempts */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Previous Attempts</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/student/results")} className="text-xs">
              Results <ArrowRight className="w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {attempts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <InboxIcon className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No attempts yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">Completed viva results will appear here.</p>
                {upcomingSessions.length > 0 && (
                  <Button size="sm" className="mt-4" onClick={() => startExam(upcomingSessions[0])}>
                    Start Your First Viva
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {attempts.map((attempt, i) => (
                  <motion.div
                    key={attempt.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="p-3 border rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => navigate("/student/results")}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium">{attempt.subject}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(attempt.date)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{attempt.score}%</span>
                        <Badge variant="outline" className="text-xs">{attempt.grade}</Badge>
                      </div>
                    </div>
                    <Progress value={attempt.score} className="h-1.5" />
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Start Viva",
            desc: "Begin your next exam",
            color: "bg-blue-600 text-white",
            onClick: () => {
              if (upcomingSessions.length > 0) startExam(upcomingSessions[0])
              else navigate("/student/instructions")
            },
          },
          { label: "View Results", desc: "Check your scores", color: "bg-white border", onClick: () => navigate("/student/results") },
          { label: "Get Feedback", desc: "Improvement tips", color: "bg-white border", onClick: () => navigate("/student/feedback") },
          { label: "Instructions", desc: "Exam guidelines", color: "bg-white border", onClick: () => navigate("/student/instructions") },
        ].map((action, i) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.06 }}
            onClick={action.onClick}
            className={`p-3 rounded-lg text-left transition-all hover:shadow-md ${action.color}`}
          >
            <p className="text-sm font-semibold">{action.label}</p>
            <p className="text-xs opacity-70 mt-0.5">{action.desc}</p>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
