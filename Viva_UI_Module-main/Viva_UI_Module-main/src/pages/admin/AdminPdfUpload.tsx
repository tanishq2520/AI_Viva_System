// src/pages/admin/AdminPdfUpload.tsx
// Admin page: upload a PDF/DOCX file with Q&A pairs to the Question Module
import { useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Upload, FileText, CheckCircle2, AlertCircle, X, BookOpen,
  Loader2, ChevronDown, ChevronUp, Eye, EyeOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/common/PageHeader"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000"

interface ParsedQuestion {
  question_number: number
  question_text: string
  answer_text?: string
}

interface UploadResult {
  id: number
  title: string
  subject: string
  question_count: number
  questions: ParsedQuestion[]
}

export function AdminPdfUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [subject, setSubject] = useState("")
  const [teacherEmail, setTeacherEmail] = useState("admin@viva.edu")
  const [teacherPassword, setTeacherPassword] = useState("admin123")
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedQ, setExpandedQ] = useState<number | null>(null)
  const [showAnswers, setShowAnswers] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileSelect(dropped)
  }

  function handleFileSelect(f: File) {
    const ext = f.name.split(".").pop()?.toLowerCase()
    const allowed = ["pdf", "docx", "xlsx", "csv", "pptx"]
    if (!ext || !allowed.includes(ext)) {
      setError(`Unsupported file type ".${ext}". Use PDF, DOCX, XLSX, CSV, or PPTX.`)
      return
    }
    setFile(f)
    setError(null)
    setUploadResult(null)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""))
  }

  async function getAuthToken(): Promise<string> {
    // First try to register the admin teacher (idempotent), then login
    try {
      await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Admin", email: teacherEmail, password: teacherPassword }),
      })
    } catch (_) {
      // ignore — may already exist
    }
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: teacherEmail, password: teacherPassword }),
    })
    if (!loginRes.ok) {
      const errData = await loginRes.json().catch(() => ({}))
      throw new Error(errData.detail || "Authentication failed. Check teacher email/password.")
    }
    const { access_token } = await loginRes.json()
    return access_token
  }

  async function handleUpload() {
    if (!file || !title.trim()) {
      setError("Please select a file and enter a title.")
      return
    }
    setUploading(true)
    setError(null)

    try {
      const token = await getAuthToken()
      const form = new FormData()
      form.append("file", file)
      form.append("title", title.trim())
      if (subject.trim()) form.append("subject", subject.trim())

      const res = await fetch(`${API_BASE}/questions/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || `Upload failed (${res.status})`)
      }
      setUploadResult(data)
      setFile(null)
      setTitle("")
      setSubject("")
    } catch (err: any) {
      setError(err.message || "Upload failed. Make sure the Question Module API (port 8001) is running.")
    } finally {
      setUploading(false)
    }
  }

  function reset() {
    setFile(null)
    setTitle("")
    setSubject("")
    setError(null)
    setUploadResult(null)
    setExpandedQ(null)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="Upload Q&amp;A PDF"
        description="Upload a PDF, DOCX, XLSX, or CSV file containing questions and their expected answers."
        breadcrumbs={[
          { label: "Dashboard", href: "/admin/dashboard" },
          { label: "Upload Q&A PDF" },
        ]}
      />

      <div className="grid md:grid-cols-5 gap-6">
        {/* Upload form */}
        <div className="md:col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-600" />
                File Upload
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Drop zone */}
              <div
                onDragEnter={() => setDragging(true)}
                onDragLeave={() => setDragging(false)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all duration-200 ${
                  dragging
                    ? "border-blue-500 bg-blue-50"
                    : file
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.xlsx,.csv,.pptx"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
                {file ? (
                  <>
                    <FileText className="w-10 h-10 text-emerald-500 mb-3" />
                    <p className="font-medium text-sm text-slate-900">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(file.size / 1024).toFixed(1)} KB · Click to change
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFile(null) }}
                      className="absolute top-3 right-3 p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-slate-400 mb-3" />
                    <p className="font-medium text-sm text-slate-700">
                      Drag & drop a file, or <span className="text-blue-600">browse</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, DOCX, XLSX, CSV, PPTX — max 5 MB
                    </p>
                  </>
                )}
              </div>

              {/* Metadata */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="qa-title">Question Set Title *</Label>
                  <Input
                    id="qa-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Data Structures Mid-Semester Q&A"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="qa-subject">Subject (optional)</Label>
                  <Input
                    id="qa-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Computer Science"
                  />
                </div>
              </div>

              {/* Auth credentials */}
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
                  Advanced: API credentials
                </summary>
                <div className="mt-3 space-y-3 pl-1">
                  <div className="space-y-1">
                    <Label className="text-xs">Teacher Email</Label>
                    <Input
                      value={teacherEmail}
                      onChange={(e) => setTeacherEmail(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Teacher Password</Label>
                    <Input
                      type="password"
                      value={teacherPassword}
                      onChange={(e) => setTeacherPassword(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </details>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-2 pt-1">
                <Button
                  onClick={handleUpload}
                  disabled={!file || !title.trim() || uploading}
                  className="flex-1 gap-2"
                >
                  {uploading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                  ) : (
                    <><Upload className="w-4 h-4" /> Upload & Parse</>
                  )}
                </Button>
                {(file || uploadResult) && (
                  <Button variant="outline" onClick={reset}>
                    Reset
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Format guide */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-600" />
                File Format Guide
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-4 text-slate-600">
              <div>
                <p className="font-semibold text-slate-800 mb-1">📄 PDF / DOCX (Text format)</p>
                <pre className="bg-slate-50 border rounded p-2 text-xs leading-relaxed whitespace-pre-wrap font-mono">
{`Q1: What is a stack?
A1: A linear data structure that follows LIFO.

Q2: What is recursion?
A2: A function calling itself.`}
                </pre>
              </div>
              <div>
                <p className="font-semibold text-slate-800 mb-1">📊 XLSX / CSV (Table format)</p>
                <div className="bg-slate-50 border rounded overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="p-1.5 text-left border-r">Question</th>
                        <th className="p-1.5 text-left">Answer</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-1.5 border-r border-t">What is a stack?</td>
                        <td className="p-1.5 border-t">A LIFO data structure</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded p-2">
                <p className="font-medium text-amber-800 mb-1">⚠️ Requirements</p>
                <ul className="space-y-0.5 text-amber-700">
                  <li>• Minimum 10 Q&A pairs</li>
                  <li>• Maximum 15 Q&A pairs</li>
                  <li>• Max file size: 5 MB</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upload result */}
      <AnimatePresence>
        {uploadResult && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <Card className="border-emerald-200 bg-emerald-50/40">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <CardTitle className="text-base text-emerald-800">
                    Successfully Uploaded!
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAnswers((s) => !s)}
                    className="gap-1.5 h-7 text-xs"
                  >
                    {showAnswers ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showAnswers ? "Hide Answers" : "Show Answers"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3 mb-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Title: </span>
                    <span className="font-medium">{uploadResult.title}</span>
                  </div>
                  {uploadResult.subject && (
                    <div>
                      <span className="text-muted-foreground">Subject: </span>
                      <span className="font-medium">{uploadResult.subject}</span>
                    </div>
                  )}
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                    {uploadResult.question_count} questions
                  </Badge>
                </div>

                <div className="space-y-2">
                  {uploadResult.questions.map((q) => (
                    <div key={q.question_number} className="border bg-white rounded-lg overflow-hidden">
                      <button
                        className="w-full flex items-start gap-3 p-3 text-left hover:bg-slate-50 transition-colors"
                        onClick={() => setExpandedQ(expandedQ === q.question_number ? null : q.question_number)}
                      >
                        <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {q.question_number}
                        </span>
                        <p className="flex-1 text-sm font-medium text-slate-800 leading-snug">
                          {q.question_text}
                        </p>
                        {expandedQ === q.question_number ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </button>
                      <AnimatePresence>
                        {expandedQ === q.question_number && showAnswers && q.answer_text && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3 pl-12 text-sm text-slate-600 border-t bg-emerald-50/50">
                              <p className="text-xs font-semibold text-emerald-700 mb-1 mt-2">Expected Answer:</p>
                              <p className="leading-relaxed">{q.answer_text}</p>
                            </div>
                          </motion.div>
                        )}
                        {expandedQ === q.question_number && !showAnswers && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3 pl-12 text-xs text-muted-foreground border-t pt-2">
                              Click "Show Answers" to reveal the expected answer.
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
