// src/services/mockData.ts
// All data structures are defined here as empty — ready for backend integration.
// Pages consume these exports and gracefully handle empty/zero states.

export const mockStudent = {
  id: "",
  name: "",
  email: "",
  rollNumber: "",
  department: "",
  semester: "",
  avatar: "",
  gpa: 0,
}

export const mockFaculty = {
  id: "",
  name: "",
  email: "",
  department: "",
  designation: "",
  avatar: "",
  coursesManaged: 0,
}

export const mockUpcomingSessions: {
  id: string
  subject: string
  date: string
  time: string
  duration: string
  status: string
  examiner: string
  totalQuestions: number
}[] = []

export const mockPreviousAttempts: {
  id: string
  subject: string
  date: string
  score: number
  grade: string
  status: string
  duration: string
  questionsAttempted: number
  totalQuestions: number
}[] = []

export const mockVivaQuestions: {
  id: number
  question: string
  category: string
  difficulty: string
  expectedKeywords: string[]
  timeLimit: number
}[] = []

export const mockTranscriptLines: string[] = []

export const mockResultData = {
  studentName: "",
  subject: "",
  date: "",
  duration: "",
  overallScore: 0,
  grade: "—",
  totalQuestions: 0,
  attempted: 0,
  scores: {
    communication: 0,
    conceptUnderstanding: 0,
    accuracy: 0,
    fluency: 0,
    depth: 0,
  },
  sectionScores: [] as { name: string; score: number }[],
  performanceTrend: [] as { attempt: string; score: number }[],
}

export const mockFeedback = {
  strengths: [] as string[],
  improvements: [] as string[],
  recommendations: [] as string[],
  topicFeedback: [] as {
    topic: string
    score: number
    comment: string
  }[],
}

export const mockFacultyStats = {
  totalStudents: 0,
  activeSessions: 0,
  assessmentsCompleted: 0,
  averageScore: 0,
  pendingReviews: 0,
  questionsInBank: 0,
}

export const mockQuestions: {
  id: string
  question: string
  subject: string
  category: string
  difficulty: string
  language: string
  createdBy: string
  createdAt: string
  lastModified: string
  timesUsed: number
  avgScore: number
  status: string
}[] = []

export const mockActiveSessions: {
  id: string
  student: string
  rollNumber: string
  subject: string
  currentQuestion: number
  totalQuestions: number
  elapsedTime: string
  currentScore: number
  status: string
  lastTranscript: string
}[] = []

export const mockAnalyticsData = {
  performanceTrend: [] as {
    month: string
    avgScore: number
    students: number
  }[],
  departmentPerformance: [] as {
    department: string
    avgScore: number
    students: number
    color: string
  }[],
  scoreDistribution: [] as {
    range: string
    count: number
    percentage: number
  }[],
  languageStats: [] as {
    language: string
    count: number
    percentage: number
  }[],
  subjectPerformance: [] as {
    subject: string
    avgScore: number
  }[],
}

export const mockReports: {
  id: string
  title: string
  type: string
  generatedOn: string
  generatedBy: string
  students: number
  format: string
  size: string
  status: string
}[] = []

export const mockRecentActivity: {
  id: number
  type: string
  message: string
  time: string
}[] = []
