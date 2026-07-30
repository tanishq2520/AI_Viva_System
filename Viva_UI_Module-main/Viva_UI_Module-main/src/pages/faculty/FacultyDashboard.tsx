// src/pages/faculty/FacultyDashboard.tsx
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Users, BookOpen, Monitor, TrendingUp, Activity, Clock, InboxIcon, Settings, Save } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/common/StatCard"
import { PageHeader } from "@/components/common/PageHeader"
import { mockRecentActivity, mockActiveSessions } from "@/services/mockData"
import { getInitials } from "@/utils/helpers"
import { useAuth } from "@/contexts/AuthContext"
import { fetchAllAttempts } from "@/services/api"
import { getBankQuestions } from "@/services/questionBank"

export function FacultyDashboard() {
  const { user } = useAuth()
  const [timeLimitStr, setTimeLimitStr] = useState("30")
  const [attempts, setAttempts] = useState<any[]>([])
  const [questionsCount, setQuestionsCount] = useState(() => getBankQuestions().length)

  useEffect(() => {
    // Load time limit
    const saved = localStorage.getItem("viva_time_limit")
    if (saved) {
      setTimeLimitStr((parseInt(saved) / 60).toString())
    }

    // Refresh questions count
    setQuestionsCount(getBankQuestions().length)

    // Load attempts for live stats
    fetchAllAttempts()
      .then((data) => setAttempts(data || []))
      .catch(() => setAttempts([]))
  }, [])

  function handleSaveTimeLimit() {
    const mins = parseInt(timeLimitStr)
    if (!isNaN(mins) && mins > 0) {
      localStorage.setItem("viva_time_limit", (mins * 60).toString())
      alert("Default time limit saved successfully!")
    }
  }

  const uniqueStudents = new Set(attempts.map((a) => a.studentId)).size
  const avgScore =
    attempts.length > 0
      ? Math.round(attempts.reduce((s, a) => s + (a.percentage ?? 0), 0) / attempts.length)
      : 0

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Faculty Dashboard"
        description="Monitor student performance and manage examinations."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="col-span-2 md:col-span-1 lg:col-span-2">
          <StatCard title="Total Students" value={uniqueStudents} icon={Users} iconColor="text-blue-600" iconBg="bg-blue-50" index={0} />
        </div>
        <div className="col-span-2 md:col-span-1 lg:col-span-2">
          <StatCard title="Assessments Done" value={attempts.length} icon={BookOpen} iconColor="text-green-600" iconBg="bg-green-50" index={1} />
        </div>
        <div className="col-span-2 md:col-span-1 lg:col-span-2">
          <StatCard title="Active Sessions" value={0} icon={Monitor} iconColor="text-purple-600" iconBg="bg-purple-50" description="Live right now" index={2} />
        </div>
        <div className="col-span-2 md:col-span-1 lg:col-span-2">
          <StatCard title="Avg Score" value={avgScore > 0 ? `${avgScore}%` : "—"} icon={TrendingUp} iconColor="text-amber-600" iconBg="bg-amber-50" index={3} />
        </div>
        <div className="col-span-2 md:col-span-1 lg:col-span-2">
          <StatCard title="Pending Reviews" value={0} icon={Clock} iconColor="text-orange-600" iconBg="bg-orange-50" index={4} />
        </div>
        <div className="col-span-2 md:col-span-1 lg:col-span-2">
          <StatCard title="Questions Bank" value={questionsCount} icon={Activity} iconColor="text-indigo-600" iconBg="bg-indigo-50" index={5} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Active sessions */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live Sessions
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <InboxIcon className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm font-medium text-muted-foreground">No active live sessions</p>
              <p className="text-xs text-muted-foreground mt-0.5">When students begin their viva, active sessions will appear here.</p>
            </div>
          </CardContent>
        </Card>

        {/* Examination Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-600" />
              Examination Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="viva-time">Default Viva Time Limit (Minutes)</Label>
              <div className="flex gap-2">
                <Input
                  id="viva-time"
                  type="number"
                  min="5"
                  max="180"
                  value={timeLimitStr}
                  onChange={(e) => setTimeLimitStr(e.target.value)}
                />
                <Button onClick={handleSaveTimeLimit} className="gap-1.5 flex-shrink-0">
                  <Save className="w-4 h-4" /> Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Sets the countdown timer allocated for students taking viva examinations.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
