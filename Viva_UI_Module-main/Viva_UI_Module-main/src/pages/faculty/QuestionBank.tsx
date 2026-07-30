// src/pages/faculty/QuestionBank.tsx
// Persistent Question Bank with localStorage backing, per-question answers, and PDF upload
import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus, Search, Edit2, Trash2, BookOpen, Upload, FileText,
  CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronUp,
  Eye, EyeOff, X, RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/common/PageHeader"
import { useAuth } from "@/contexts/AuthContext"
import { getBankQuestions, saveBankQuestions, type BankQuestion } from "@/services/questionBank"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000"

const defaultForm = {
  question: "",
  answer: "",
  subject: "",
  category: "",
  difficulty: "Medium" as BankQuestion["difficulty"],
  language: "English",
  status: "active" as BankQuestion["status"],
  timeLimit: 120,
}

export function QuestionBank() {
  const { user } = useAuth()
  const [questions, setQuestions] = useState<BankQuestion[]>(getBankQuestions)
  const [search, setSearch] = useState("")
  const [filterSubject, setFilterSubject] = useState("all")
  const [filterDifficulty, setFilterDifficulty] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [showDialog, setShowDialog] = useState(false)
  const [editingQ, setEditingQ] = useState<BankQuestion | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [showAnswerInDialog, setShowAnswerInDialog] = useState(true)
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<"list" | "upload">("list")

  // PDF upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState("")
  const [uploadSubject, setUploadSubject] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Persist to localStorage whenever questions change
  useEffect(() => {
    saveBankQuestions(questions)
  }, [questions])

  const subjects = [...new Set(questions.map((q) => q.subject).filter(Boolean))]

  const filtered = questions.filter((q) => {
    const matchSearch =
      q.question.toLowerCase().includes(search.toLowerCase()) ||
      q.subject.toLowerCase().includes(search.toLowerCase()) ||
      q.category.toLowerCase().includes(search.toLowerCase()) ||
      q.answer.toLowerCase().includes(search.toLowerCase())
    const matchSubject = filterSubject === "all" || q.subject === filterSubject
    const matchDifficulty = filterDifficulty === "all" || q.difficulty === filterDifficulty
    const matchStatus = filterStatus === "all" || q.status === filterStatus
    return matchSearch && matchSubject && matchDifficulty && matchStatus
  })

  const activeCount = questions.filter((q) => q.status === "active").length

  function openCreate() {
    setEditingQ(null)
    setForm(defaultForm)
    setShowDialog(true)
  }

  function openEdit(q: BankQuestion) {
    setEditingQ(q)
    setForm({
      question: q.question,
      answer: q.answer,
      subject: q.subject,
      category: q.category,
      difficulty: q.difficulty,
      language: q.language,
      status: q.status,
      timeLimit: q.timeLimit ?? 120,
    })
    setShowDialog(true)
  }

  function handleSave() {
    if (!form.question.trim() || !form.subject.trim()) return
    if (editingQ) {
      setQuestions((qs) =>
        qs.map((q) =>
          q.id === editingQ.id
            ? { ...q, ...form, question: form.question.trim(), answer: form.answer.trim() }
            : q
        )
      )
    } else {
      const newQ: BankQuestion = {
        id: `Q-${Date.now()}`,
        ...form,
        question: form.question.trim(),
        answer: form.answer.trim(),
        createdBy: user?.name ?? "Faculty",
        createdAt: new Date().toISOString().split("T")[0],
        timesUsed: 0,
      }
      setQuestions((qs) => [newQ, ...qs])
    }
    setShowDialog(false)
  }

  function handleDelete(id: string) {
    setQuestions((qs) => qs.filter((q) => q.id !== id))
    setDeleteId(null)
  }

  function toggleAnswer(id: string) {
    setExpandedAnswers((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // PDF upload handlers
  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }

  function handleFileSelect(f: File) {
    const ext = f.name.split(".").pop()?.toLowerCase()
    if (!["pdf", "docx", "xlsx", "csv", "pptx"].includes(ext ?? "")) {
      setUploadError(`Unsupported format ".${ext}". Use PDF, DOCX, XLSX, CSV, or PPTX.`)
      return
    }
    setUploadFile(f)
    setUploadError(null)
    setUploadSuccess(null)
    if (!uploadTitle) setUploadTitle(f.name.replace(/\.[^.]+$/, ""))
  }

  async function handlePdfUpload() {
    if (!uploadFile || !uploadTitle.trim()) {
      setUploadError("Please select a file and enter a title.")
      return
    }
    setUploading(true)
    setUploadError(null)
    setUploadSuccess(null)

    try {
      const fd = new FormData()
      fd.append("file", uploadFile)
      fd.append("title", uploadTitle.trim())
      if (uploadSubject.trim()) fd.append("subject", uploadSubject.trim())

      // Use the public parse endpoint — no authentication required
      const res = await fetch(`${API_BASE}/questions/parse-public`, {
        method: "POST",
        body: fd,
      })

      let data: any
      try {
        data = await res.json()
      } catch {
        throw new Error("Invalid response from Question Module API. Make sure it is running on port 8001.")
      }

      if (!res.ok) {
        throw new Error(
          data.detail ||
            `Parse failed (HTTP ${res.status}). Make sure the Question Module API (port 8001) is running.`
        )
      }

      // Convert parsed Q&A into bank questions and add them to localStorage
      const parsedQs: BankQuestion[] = (data.questions ?? []).map((q: any, i: number) => ({
        id: `PDF-${Date.now()}-${i}`,
        question: (q.question_text ?? "").trim(),
        answer: (q.answer_text ?? "").trim(),
        subject: (uploadSubject.trim() || data.subject || uploadTitle.trim()),
        category: "From PDF",
        difficulty: "Medium" as const,
        language: "English",
        status: "active" as const,
        timeLimit: 120,
        createdBy: user?.name ?? "Faculty",
        createdAt: new Date().toISOString().split("T")[0],
        timesUsed: 0,
      }))

      if (parsedQs.length === 0) {
        throw new Error(
          "No Q&A pairs were found in the file. Check the format guide — questions must follow the Q1:/A1: pattern or have Question/Answer columns."
        )
      }

      setQuestions((qs) => [...parsedQs, ...qs])
      setUploadSuccess(
        `✅ Imported ${parsedQs.length} questions from "${uploadFile.name}" into the Question Bank. Students will see them in their next viva.`
      )
      setUploadFile(null)
      setUploadTitle("")
      setUploadSubject("")
    } catch (err: any) {
      setUploadError(err.message || "Upload failed. Make sure the Question Module API (port 8001) is running.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Question Bank"
        description={`${questions.length} questions · ${activeCount} active · Saved to local storage`}
        breadcrumbs={[
          { label: "Dashboard", href: "/faculty/dashboard" },
          { label: "Question Bank" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              variant={activeTab === "upload" ? "default" : "outline"}
              onClick={() => setActiveTab("upload")}
              className="gap-1.5"
            >
              <Upload className="w-4 h-4" /> Upload PDF
            </Button>
            <Button onClick={openCreate} className="gap-1.5">
              <Plus className="w-4 h-4" /> Add Question
            </Button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-5">
        {(["list", "upload"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "list" ? `Questions (${questions.length})` : "Upload PDF / DOCX"}
          </button>
        ))}
      </div>

      {/* ── Tab: Upload PDF ─────────────────────────────────────────────────── */}
      {activeTab === "upload" && (
        <div className="grid md:grid-cols-5 gap-6">
          <div className="md:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-600" />
                  Import Questions from File
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Drop zone */}
                <div
                  onDragEnter={() => setDragging(true)}
                  onDragLeave={() => setDragging(false)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all ${
                    dragging
                      ? "border-blue-500 bg-blue-50"
                      : uploadFile
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
                  {uploadFile ? (
                    <>
                      <FileText className="w-10 h-10 text-emerald-500 mb-3" />
                      <p className="font-medium text-sm">{uploadFile.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(uploadFile.size / 1024).toFixed(1)} KB · Click to change
                      </p>
                      <button
                        onClick={(e) => { e.stopPropagation(); setUploadFile(null) }}
                        className="absolute top-3 right-3 p-1 rounded-full hover:bg-slate-200 text-slate-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-slate-400 mb-3" />
                      <p className="font-medium text-sm text-slate-700">
                        Drag & drop, or <span className="text-blue-600">browse</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, XLSX, CSV, PPTX — max 5 MB</p>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Question Set Title *</Label>
                    <Input
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="e.g. Data Structures Q&A"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Subject (optional)</Label>
                    <Input
                      value={uploadSubject}
                      onChange={(e) => setUploadSubject(e.target.value)}
                      placeholder="e.g. Computer Science"
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {uploadError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
                    >
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {uploadError}
                    </motion.div>
                  )}
                  {uploadSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700"
                    >
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {uploadSuccess}
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  onClick={handlePdfUpload}
                  disabled={!uploadFile || !uploadTitle.trim() || uploading}
                  className="w-full gap-2"
                >
                  {uploading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Uploading & Parsing…</>
                  ) : (
                    <><Upload className="w-4 h-4" /> Import into Question Bank</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
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
                  <pre className="bg-slate-50 border rounded p-2 text-xs leading-relaxed whitespace-pre-wrap font-mono">{`Q1: What is a stack?
A1: A linear data structure following LIFO.

Q2: What is recursion?
A2: A function that calls itself.`}</pre>
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
                <div className="bg-blue-50 border border-blue-200 rounded p-2 text-blue-700">
                  <p className="font-medium mb-1">ℹ️ After importing</p>
                  <p>Questions will be added to the bank and students will automatically see them in their next viva exam.</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded p-2 text-amber-700">
                  <p className="font-medium mb-1">⚠️ Requirements</p>
                  <ul className="space-y-0.5">
                    <li>• Min 10 – Max 15 Q&A pairs</li>
                    <li>• Max file size: 5 MB</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Tab: Question List ───────────────────────────────────────────────── */}
      {activeTab === "list" && (
        <>
          {/* Info banner */}
          {questions.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 mb-4">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>{activeCount} active questions</strong> will be shown to students in their viva exam.
                Answers are hidden from students — used only for evaluation.
              </span>
            </div>
          )}

          {/* Filters */}
          <Card className="mb-5">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search questions, subjects, answers…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterSubject} onValueChange={setFilterSubject}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
                {(search || filterSubject !== "all" || filterDifficulty !== "all" || filterStatus !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch("")
                      setFilterSubject("all")
                      setFilterDifficulty("all")
                      setFilterStatus("all")
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Questions list */}
          <Card>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="text-center py-16">
                  <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No questions found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add questions manually or import from a PDF/DOCX file.
                  </p>
                  <div className="flex justify-center gap-2 mt-4">
                    <Button size="sm" onClick={openCreate} className="gap-1">
                      <Plus className="w-3 h-3" /> Add Question
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setActiveTab("upload")} className="gap-1">
                      <Upload className="w-3 h-3" /> Upload PDF
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="divide-y">
                  {filtered.map((q, i) => (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.04, 0.4) }}
                      className="p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {/* Number */}
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {i + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Question text */}
                          <p className="text-sm font-semibold text-slate-900 leading-snug mb-1.5">
                            {q.question}
                          </p>

                          {/* Meta badges */}
                          <div className="flex flex-wrap items-center gap-1.5 mb-2">
                            <Badge variant="outline" className="text-xs">{q.subject}</Badge>
                            {q.category && <Badge variant="outline" className="text-xs">{q.category}</Badge>}
                            <Badge
                              variant={
                                q.difficulty === "Hard"
                                  ? "destructive"
                                  : q.difficulty === "Easy"
                                  ? "success"
                                  : "warning"
                              }
                              className="text-xs"
                            >
                              {q.difficulty}
                            </Badge>
                            <Badge variant={q.status === "active" ? "success" : "muted"} className="text-xs capitalize">
                              {q.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{q.timeLimit}s · {q.language}</span>
                            <span className="text-xs text-muted-foreground">by {q.createdBy}</span>
                          </div>

                          {/* Answer accordion */}
                          <button
                            onClick={() => toggleAnswer(q.id)}
                            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-slate-700 transition-colors mb-1"
                          >
                            {expandedAnswers.has(q.id) ? (
                              <><EyeOff className="w-3.5 h-3.5" /> Hide Expected Answer</>
                            ) : (
                              <><Eye className="w-3.5 h-3.5" /> Show Expected Answer</>
                            )}
                          </button>
                          <AnimatePresence>
                            {expandedAnswers.has(q.id) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 leading-relaxed">
                                  <span className="font-semibold text-emerald-700">Expected Answer: </span>
                                  {q.answer || (
                                    <span className="italic text-emerald-600/70">No answer specified</span>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(q)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setDeleteId(q.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Create / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingQ ? "Edit Question" : "Add New Question"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Question text */}
            <div className="space-y-1.5">
              <Label>Question Text *</Label>
              <textarea
                className="w-full h-24 text-sm border border-input rounded-md p-3 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Enter the viva examination question…"
                value={form.question}
                onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
              />
            </div>

            {/* Expected answer */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Expected Answer *</Label>
                <span className="text-xs text-muted-foreground">
                  (Faculty-only — used for automated evaluation, hidden from students)
                </span>
              </div>
              <textarea
                className="w-full h-28 text-sm border border-emerald-300 bg-emerald-50/30 rounded-md p-3 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="Write the ideal/expected answer for this question. The AI will compare student speech against this…"
                value={form.answer}
                onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Be specific — include key concepts, technical terms, and important points.
              </p>
            </div>

            {/* Subject + Category */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Subject *</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="e.g. Data Structures"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category / Topic</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Core Concepts"
                />
              </div>
            </div>

            {/* Difficulty + Language + Status + Time */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label>Difficulty</Label>
                <Select
                  value={form.difficulty}
                  onValueChange={(v) => setForm((f) => ({ ...f, difficulty: v as any }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Language</Label>
                <Select
                  value={form.language}
                  onValueChange={(v) => setForm((f) => ({ ...f, language: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Hindi">Hindi</SelectItem>
                    <SelectItem value="Tamil">Tamil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as any }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (shown to students)</SelectItem>
                    <SelectItem value="draft">Draft (hidden)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Time Limit (sec)</Label>
                <Input
                  type="number"
                  min={30}
                  max={600}
                  value={form.timeLimit}
                  onChange={(e) => setForm((f) => ({ ...f, timeLimit: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!form.question.trim() || !form.subject.trim()}
            >
              {editingQ ? "Save Changes" : "Add Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Question?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently remove the question and its expected answer from the bank.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
