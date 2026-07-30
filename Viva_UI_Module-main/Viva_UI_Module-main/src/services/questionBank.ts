// src/services/questionBank.ts
// Shared service for persistent Question Bank and Viva Session scheduling

export interface BankQuestion {
  id: string
  question: string
  answer: string
  subject: string
  category: string
  difficulty: "Easy" | "Medium" | "Hard"
  language: string
  status: "active" | "draft"
  timeLimit: number // in seconds
  createdBy: string
  createdAt: string
  timesUsed: number
}

const STORAGE_KEY = "viva_question_bank"

export const INITIAL_BANK_QUESTIONS: BankQuestion[] = [
  {
    id: "DEF-1",
    question: "What is a stack, and where is it used?",
    answer: "A stack is a linear data structure following Last In First Out (LIFO). It is used in function calls, recursion, expression evaluation, and undo operations.",
    subject: "Data Structures & Algorithms",
    category: "Data Structures",
    difficulty: "Easy",
    language: "English",
    status: "active",
    timeLimit: 120,
    createdBy: "Faculty Panel",
    createdAt: "2026-07-30",
    timesUsed: 1,
  },
  {
    id: "DEF-2",
    question: "Explain the difference between an array and a linked list.",
    answer: "An array stores elements in contiguous memory with fixed size and O(1) index access. A linked list uses nodes with pointers, dynamic sizing, and O(n) search time.",
    subject: "Data Structures & Algorithms",
    category: "Data Structures",
    difficulty: "Medium",
    language: "English",
    status: "active",
    timeLimit: 120,
    createdBy: "Faculty Panel",
    createdAt: "2026-07-30",
    timesUsed: 1,
  },
  {
    id: "DEF-3",
    question: "What is time complexity and why is it important?",
    answer: "Time complexity measures algorithm execution time relative to input size n, expressed using Big O notation to evaluate scalability and performance.",
    subject: "Data Structures & Algorithms",
    category: "Algorithms",
    difficulty: "Medium",
    language: "English",
    status: "active",
    timeLimit: 120,
    createdBy: "Faculty Panel",
    createdAt: "2026-07-30",
    timesUsed: 1,
  },
  {
    id: "DEF-4",
    question: "Describe binary search and its prerequisite.",
    answer: "Binary search divides sorted arrays in half repeatedly with O(log n) time complexity. Prerequisite: input array must be sorted.",
    subject: "Data Structures & Algorithms",
    category: "Algorithms",
    difficulty: "Medium",
    language: "English",
    status: "active",
    timeLimit: 120,
    createdBy: "Faculty Panel",
    createdAt: "2026-07-30",
    timesUsed: 1,
  },
  {
    id: "DEF-5",
    question: "What is normalization in databases?",
    answer: "Normalization organizes relational tables to eliminate redundancy, avoid update anomalies, and maintain data integrity using normal forms.",
    subject: "Data Structures & Algorithms",
    category: "Databases",
    difficulty: "Hard",
    language: "English",
    status: "active",
    timeLimit: 120,
    createdBy: "Faculty Panel",
    createdAt: "2026-07-30",
    timesUsed: 1,
  },
]

export function getBankQuestions(): BankQuestion[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BANK_QUESTIONS))
      return INITIAL_BANK_QUESTIONS
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BANK_QUESTIONS))
      return INITIAL_BANK_QUESTIONS
    }
    
    // Ensure the default Data Structures & Algorithms demo questions are ALWAYS present
    const hasDataStructures = parsed.some((q) => (q.subject || "").toLowerCase().includes("data structure"))
    if (!hasDataStructures) {
      const merged = [...INITIAL_BANK_QUESTIONS, ...parsed]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
      return merged
    }
    
    return parsed
  } catch {
    return INITIAL_BANK_QUESTIONS
  }
}

export function saveBankQuestions(qs: BankQuestion[]): void {
  // Always ensure demo questions are preserved when saving
  const hasDataStructures = qs.some((q) => (q.subject || "").toLowerCase().includes("data structure"))
  const finalQuestions = hasDataStructures ? qs : [...INITIAL_BANK_QUESTIONS, ...qs]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(finalQuestions))
}

export function getActiveBankQuestions(): BankQuestion[] {
  return getBankQuestions().filter((q) => q.status === "active")
}

export function getUpcomingSessionsFromBank() {
  const activeQs = getActiveBankQuestions()
  if (activeQs.length === 0) return []

  // Group active questions by subject
  const grouped: Record<string, BankQuestion[]> = {}
  for (const q of activeQs) {
    const subj = q.subject || "Data Structures & Algorithms"
    if (!grouped[subj]) grouped[subj] = []
    grouped[subj].push(q)
  }

  const sessions = Object.entries(grouped).map(([subj, qs], i) => ({
    id: `session-${i + 1}`,
    subject: subj.toLowerCase().includes("viva") || subj.toLowerCase().includes("examination") ? subj : `${subj} Examination`,
    rawSubject: subj,
    date: new Date().toISOString().split("T")[0],
    time: "Available Now",
    duration: `${Math.max(5, Math.round(qs.reduce((s, q) => s + (q.timeLimit || 120), 0) / 60))} Mins`,
    status: "scheduled",
    examiner: "Faculty Evaluation Panel",
    totalQuestions: qs.length,
    questions: qs,
  }))

  return sessions
}
