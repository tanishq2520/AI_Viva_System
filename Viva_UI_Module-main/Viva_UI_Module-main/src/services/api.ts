export type VivaQuestion = {
  id: number
  question: string
  category: string
  difficulty: string
  expectedKeywords: string[]
  timeLimit: number
  sampleTranscript?: string
}

export type VivaResult = {
  id: number
  studentId: string
  studentName: string
  subject: string
  date: string
  duration: string
  durationSeconds: number
  overallScore: number
  grade: string
  totalQuestions: number
  attempted: number
  totalScore: number
  maxScore: number
  scores: {
    communication: number
    conceptUnderstanding: number
    accuracy: number
    fluency: number
    depth: number
  }
  sectionScores: { name: string; score: number }[]
  performanceTrend: { attempt: string; score: number }[]
  answers: {
    questionId: number
    questionText: string
    expectedAnswer: string
    studentAnswer: string
    score: number
    verdict: string
    strengths: string[]
    missingPoints: string[]
    feedback: string
    category: string
  }[]
  feedbackSummary: FeedbackSummary
}

export type FeedbackSummary = {
  strengths: string[]
  improvements: string[]
  recommendations: string[]
  topicFeedback: { topic: string; score: number; comment: string }[]
}

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000"

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("viva_access_token")
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...options?.headers
    },
    ...options,
  })
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`)
  }
  return response.json() as Promise<T>
}

export const demoQuestions: VivaQuestion[] = [
  {
    id: 1,
    question: "What is a stack, and where is it used?",
    category: "Data Structures",
    difficulty: "Easy",
    expectedKeywords: ["stack", "linear", "last", "first", "recursion"],
    timeLimit: 120,
    sampleTranscript: "A stack is a linear data structure that follows last in first out and is used in recursion and undo operations.",
  },
  {
    id: 2,
    question: "Explain the difference between an array and a linked list.",
    category: "Data Structures",
    difficulty: "Medium",
    expectedKeywords: ["array", "linked", "list", "memory", "nodes"],
    timeLimit: 120,
    sampleTranscript: "Arrays use contiguous memory and direct indexes. Linked lists use connected nodes and need traversal.",
  },
  {
    id: 3,
    question: "What is time complexity and why is it important?",
    category: "Algorithms",
    difficulty: "Easy",
    expectedKeywords: ["time", "complexity", "running", "input", "scalability"],
    timeLimit: 120,
    sampleTranscript: "Time complexity explains how running time grows with input size and helps compare algorithm scalability.",
  },
]

export async function fetchQuestions(): Promise<VivaQuestion[]> {
  const data = await request<{ questions: VivaQuestion[] }>("/api/questions")
  return data.questions
}

export async function submitAttempt(payload: {
  studentId: string
  studentName: string
  subject: string
  durationSeconds: number
  answers: { questionId: number; answer: string }[]
}): Promise<VivaResult> {
  const data = await request<{ result: VivaResult }>("/api/attempts", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return data.result
}

export async function fetchLatestResult(): Promise<VivaResult | null> {
  const data = await request<{ result: VivaResult | null }>("/api/results/latest")
  return data.result
}

export async function fetchStudentResult(studentId: string): Promise<VivaResult | null> {
  const data = await request<{ result: VivaResult | null }>(
    `/api/results/student/${encodeURIComponent(studentId)}`
  )
  return data.result
}

export async function fetchStudentAttempts(studentId: string): Promise<any[]> {
  const data = await request<{ attempts: any[] }>(
    `/api/attempts/student/${encodeURIComponent(studentId)}`
  )
  return data.attempts
}

export async function fetchAllAttempts(): Promise<any[]> {
  const data = await request<{ attempts: any[] }>("/api/results/all")
  return data.attempts
}

export async function fetchLatestFeedback(): Promise<FeedbackSummary | null> {
  const data = await request<{ feedback: FeedbackSummary | null }>("/api/feedback/latest")
  return data.feedback
}

export async function fetchAttemptById(id: string): Promise<VivaResult | null> {
  try {
    const data = await request<{ result: VivaResult | null }>(`/api/attempts/${encodeURIComponent(id)}`)
    return data.result
  } catch {
    return null
  }
}
