// src/pages/student/StudentRegister.tsx
import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/AuthContext"
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface FormState {
  fullName: string
  email: string
  rollNumber: string
  department: string
  semester: string
  password: string
  confirmPassword: string
}

interface TouchedState {
  fullName: boolean
  email: boolean
  rollNumber: boolean
  department: boolean
  semester: boolean
  password: boolean
  confirmPassword: boolean
}

const departments = [
  "Computer Science",
  "Information Technology",
  "Electronics & Communication",
  "Mechanical Engineering",
  "Civil Engineering",
  "Electrical Engineering",
]

const semesters = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"]

function getErrors(form: FormState) {
  return {
    fullName: !form.fullName.trim() ? "Full name is required" : form.fullName.trim().length < 3 ? "Name must be at least 3 characters" : "",
    email: !form.email ? "Email is required" : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ? "Enter a valid email address" : "",
    rollNumber: !form.rollNumber.trim() ? "Roll number is required" : "",
    department: !form.department ? "Please select your department" : "",
    semester: !form.semester ? "Please select your semester" : "",
    password: !form.password ? "Password is required" : form.password.length < 8 ? "Password must be at least 8 characters" : "",
    confirmPassword: !form.confirmPassword ? "Please confirm your password" : form.confirmPassword !== form.password ? "Passwords do not match" : "",
  }
}

export function StudentRegister() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [form, setForm] = useState<FormState>({
    fullName: "", email: "", rollNumber: "", department: "",
    semester: "", password: "", confirmPassword: "",
  })
  const [touched, setTouched] = useState<TouchedState>({
    fullName: false, email: false, rollNumber: false, department: false,
    semester: false, password: false, confirmPassword: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState("")

  const errors = getErrors(form)
  const isValid = Object.values(errors).every((e) => !e)

  function blur(field: keyof TouchedState) {
    setTouched((t) => ({ ...t, [field]: true }))
  }

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setServerError("") // clear any server-side error when user edits
  }

  function showError(field: keyof FormState) {
    return touched[field] && errors[field]
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched({
      fullName: true, email: true, rollNumber: true, department: true,
      semester: true, password: true, confirmPassword: true,
    })
    if (!isValid) return
    setLoading(true)
    setServerError("")
    await new Promise((r) => setTimeout(r, 600))

    const result = register(form, "student")

    setLoading(false)
    if (!result.success) {
      setServerError(result.error ?? "Registration failed. Please try again.")
      return
    }
    setSuccess(true)
  }

  if (success) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="shadow-lg border-slate-100">
          <CardContent className="pt-8 pb-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle className="w-7 h-7 text-green-600" />
            </motion.div>
            <h2 className="text-lg font-semibold mb-1">Account Created!</h2>
            <p className="text-sm text-muted-foreground mb-1">
              Welcome, <span className="font-medium text-slate-900">{form.fullName}</span>.
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              Roll Number: <span className="font-medium text-slate-900">{form.rollNumber}</span>
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Your student account has been registered successfully. You can now sign in.
            </p>
            <Button className="w-full" onClick={() => navigate("/student/login")}>
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card className="shadow-lg border-slate-100">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Student Registration</CardTitle>
          <CardDescription>Create your student account to access the viva examination portal.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-4">

              {/* Server-side error (duplicate email / roll number) */}
              {serverError && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{serverError}</span>
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="reg-name">Full Name <span className="text-red-500">*</span></Label>
                <Input
                  id="reg-name"
                  placeholder="e.g. Arjun Sharma"
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                  onBlur={() => blur("fullName")}
                  className={showError("fullName") ? "border-red-300 focus-visible:ring-red-300" : ""}
                  autoComplete="name"
                />
                {showError("fullName") && <p className="text-xs text-red-500">{errors.fullName}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="reg-email">Email Address <span className="text-red-500">*</span></Label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="rollnumber@university.edu"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  onBlur={() => blur("email")}
                  className={showError("email") ? "border-red-300 focus-visible:ring-red-300" : ""}
                  autoComplete="email"
                />
                {showError("email") && <p className="text-xs text-red-500">{errors.email}</p>}
              </div>

              {/* Roll Number */}
              <div className="space-y-1.5">
                <Label htmlFor="reg-roll">Roll Number <span className="text-red-500">*</span></Label>
                <Input
                  id="reg-roll"
                  placeholder="e.g. CS21B045"
                  value={form.rollNumber}
                  onChange={(e) => set("rollNumber", e.target.value.toUpperCase())}
                  onBlur={() => blur("rollNumber")}
                  className={showError("rollNumber") ? "border-red-300 focus-visible:ring-red-300" : ""}
                />
                {showError("rollNumber") && <p className="text-xs text-red-500">{errors.rollNumber}</p>}
              </div>

              {/* Department & Semester */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-dept">Department <span className="text-red-500">*</span></Label>
                  <Select
                    value={form.department}
                    onValueChange={(v) => { set("department", v); blur("department") }}
                  >
                    <SelectTrigger id="reg-dept" className={showError("department") ? "border-red-300" : ""}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {showError("department") && <p className="text-xs text-red-500">{errors.department}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-sem">Semester <span className="text-red-500">*</span></Label>
                  <Select
                    value={form.semester}
                    onValueChange={(v) => { set("semester", v); blur("semester") }}
                  >
                    <SelectTrigger id="reg-sem" className={showError("semester") ? "border-red-300" : ""}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {semesters.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {showError("semester") && <p className="text-xs text-red-500">{errors.semester}</p>}
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="reg-password">Password <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    onBlur={() => blur("password")}
                    className={`pr-10 ${showError("password") ? "border-red-300 focus-visible:ring-red-300" : ""}`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {showError("password") && <p className="text-xs text-red-500">{errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="reg-confirm">Confirm Password <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    id="reg-confirm"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={form.confirmPassword}
                    onChange={(e) => set("confirmPassword", e.target.value)}
                    onBlur={() => blur("confirmPassword")}
                    className={`pr-10 ${showError("confirmPassword") ? "border-red-300 focus-visible:ring-red-300" : ""}`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirm((s) => !s)}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {showError("confirmPassword") && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
              </div>

              {/* Password strength indicator */}
              {form.password && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => {
                      const strength =
                        (form.password.length >= 8 ? 1 : 0) +
                        (/[A-Z]/.test(form.password) ? 1 : 0) +
                        (/[0-9]/.test(form.password) ? 1 : 0) +
                        (/[^A-Za-z0-9]/.test(form.password) ? 1 : 0)
                      const active = level <= strength
                      const color = strength <= 1 ? "bg-red-400" : strength === 2 ? "bg-amber-400" : strength === 3 ? "bg-blue-500" : "bg-green-500"
                      return (
                        <div key={level} className={`h-1 flex-1 rounded-full transition-colors ${active ? color : "bg-slate-200"}`} />
                      )
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(() => {
                      const s = (form.password.length >= 8 ? 1 : 0) + (/[A-Z]/.test(form.password) ? 1 : 0) + (/[0-9]/.test(form.password) ? 1 : 0) + (/[^A-Za-z0-9]/.test(form.password) ? 1 : 0)
                      return s <= 1 ? "Weak" : s === 2 ? "Fair" : s === 3 ? "Good" : "Strong"
                    })()} password
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Creating Account…</>
                ) : (
                  "Create Account"
                )}
              </Button>

              <p className="text-center text-xs text-slate-500">
                Already have an account?{" "}
                <Link to="/student/login" className="text-blue-600 hover:underline font-medium">
                  Sign In
                </Link>
              </p>

              <p className="text-center text-xs text-slate-500">
                Are you faculty?{" "}
                <Link to="/faculty/register" className="text-blue-600 hover:underline font-medium">
                  Faculty Registration
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}
