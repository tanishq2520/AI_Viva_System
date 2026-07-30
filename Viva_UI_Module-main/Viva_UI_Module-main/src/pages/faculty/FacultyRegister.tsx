// src/pages/faculty/FacultyRegister.tsx
import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/AuthContext"
import { Eye, EyeOff, Loader2, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface FormState {
  fullName: string
  email: string
  employeeId: string
  department: string
  designation: string
  password: string
  confirmPassword: string
}

interface TouchedState {
  fullName: boolean
  email: boolean
  employeeId: boolean
  department: boolean
  designation: boolean
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

const designations = [
  "Professor",
  "Associate Professor",
  "Assistant Professor",
  "Senior Lecturer",
  "Lecturer",
  "Research Scholar",
]

function getErrors(form: FormState) {
  return {
    fullName: !form.fullName.trim()
      ? "Full name is required"
      : form.fullName.trim().length < 3
      ? "Name must be at least 3 characters"
      : "",
    email: !form.email
      ? "Email is required"
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
      ? "Enter a valid email address"
      : "",
    employeeId: !form.employeeId.trim() ? "Employee ID is required" : "",
    department: !form.department ? "Please select your department" : "",
    designation: !form.designation ? "Please select your designation" : "",
    password: !form.password
      ? "Password is required"
      : form.password.length < 8
      ? "Password must be at least 8 characters"
      : "",
    confirmPassword: !form.confirmPassword
      ? "Please confirm your password"
      : form.confirmPassword !== form.password
      ? "Passwords do not match"
      : "",
  }
}

export function FacultyRegister() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [form, setForm] = useState<FormState>({
    fullName: "", email: "", employeeId: "", department: "",
    designation: "", password: "", confirmPassword: "",
  })
  const [touched, setTouched] = useState<TouchedState>({
    fullName: false, email: false, employeeId: false, department: false,
    designation: false, password: false, confirmPassword: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const errors = getErrors(form)
  const isValid = Object.values(errors).every((e) => !e)

  function blur(field: keyof TouchedState) {
    setTouched((t) => ({ ...t, [field]: true }))
  }

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function showError(field: keyof FormState) {
    return touched[field] && errors[field]
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched({
      fullName: true, email: true, employeeId: true, department: true,
      designation: true, password: true, confirmPassword: true,
    })
    if (!isValid) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1000))
    
    register(form, "faculty")
    
    setLoading(false)
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
            <h2 className="text-lg font-semibold mb-1">Account Registered!</h2>
            <p className="text-sm text-muted-foreground mb-1">
              Welcome, <span className="font-medium text-slate-900">{form.fullName}</span>.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Your faculty account has been registered. You can now sign in to the faculty portal.
            </p>
            <Button className="w-full" onClick={() => navigate("/faculty/login")}>
              Go to Faculty Login
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card className="shadow-lg border-slate-100">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Faculty Registration</CardTitle>
          <CardDescription>
            Create your faculty account to manage viva examinations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="freg-name">Full Name <span className="text-red-500">*</span></Label>
                <Input
                  id="freg-name"
                  placeholder="e.g. Dr. Priya Nair"
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
                <Label htmlFor="freg-email">Institutional Email <span className="text-red-500">*</span></Label>
                <Input
                  id="freg-email"
                  type="email"
                  placeholder="name@university.edu"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  onBlur={() => blur("email")}
                  className={showError("email") ? "border-red-300 focus-visible:ring-red-300" : ""}
                  autoComplete="email"
                />
                {showError("email") && <p className="text-xs text-red-500">{errors.email}</p>}
              </div>

              {/* Employee ID */}
              <div className="space-y-1.5">
                <Label htmlFor="freg-empid">Employee ID <span className="text-red-500">*</span></Label>
                <Input
                  id="freg-empid"
                  placeholder="e.g. FAC-2024-001"
                  value={form.employeeId}
                  onChange={(e) => set("employeeId", e.target.value.toUpperCase())}
                  onBlur={() => blur("employeeId")}
                  className={showError("employeeId") ? "border-red-300 focus-visible:ring-red-300" : ""}
                />
                {showError("employeeId") && <p className="text-xs text-red-500">{errors.employeeId}</p>}
              </div>

              {/* Department & Designation */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="freg-dept">Department <span className="text-red-500">*</span></Label>
                  <Select
                    value={form.department}
                    onValueChange={(v) => { set("department", v); blur("department") }}
                  >
                    <SelectTrigger id="freg-dept" className={showError("department") ? "border-red-300" : ""}>
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
                  <Label htmlFor="freg-desg">Designation <span className="text-red-500">*</span></Label>
                  <Select
                    value={form.designation}
                    onValueChange={(v) => { set("designation", v); blur("designation") }}
                  >
                    <SelectTrigger id="freg-desg" className={showError("designation") ? "border-red-300" : ""}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {designations.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {showError("designation") && <p className="text-xs text-red-500">{errors.designation}</p>}
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="freg-password">Password <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    id="freg-password"
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

                {/* Password strength */}
                {form.password && (
                  <div className="space-y-1 mt-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((level) => {
                        const strength =
                          (form.password.length >= 8 ? 1 : 0) +
                          (/[A-Z]/.test(form.password) ? 1 : 0) +
                          (/[0-9]/.test(form.password) ? 1 : 0) +
                          (/[^A-Za-z0-9]/.test(form.password) ? 1 : 0)
                        const active = level <= strength
                        const color =
                          strength <= 1 ? "bg-red-400" :
                          strength === 2 ? "bg-amber-400" :
                          strength === 3 ? "bg-blue-500" : "bg-green-500"
                        return (
                          <div key={level} className={`h-1 flex-1 rounded-full transition-colors ${active ? color : "bg-slate-200"}`} />
                        )
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(() => {
                        const s =
                          (form.password.length >= 8 ? 1 : 0) +
                          (/[A-Z]/.test(form.password) ? 1 : 0) +
                          (/[0-9]/.test(form.password) ? 1 : 0) +
                          (/[^A-Za-z0-9]/.test(form.password) ? 1 : 0)
                        return s <= 1 ? "Weak" : s === 2 ? "Fair" : s === 3 ? "Good" : "Strong"
                      })()} password
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="freg-confirm">Confirm Password <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input
                    id="freg-confirm"
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

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Creating Account…</>
                ) : (
                  "Register Faculty Account"
                )}
              </Button>

              <p className="text-center text-xs text-slate-500">
                Already registered?{" "}
                <Link to="/faculty/login" className="text-blue-600 hover:underline font-medium">
                  Faculty Login
                </Link>
              </p>

              <p className="text-center text-xs text-slate-500">
                Are you a student?{" "}
                <Link to="/student/register" className="text-blue-600 hover:underline font-medium">
                  Student Registration
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}
