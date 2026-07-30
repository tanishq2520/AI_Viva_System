// src/pages/student/StudentLogin.tsx
import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/AuthContext"
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export function StudentLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [touched, setTouched] = useState({ email: false, password: false })
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  const emailError = touched.email && !email.includes("@") ? "Enter a valid email address" : ""
  const passwordError = touched.password && password.length < 6 ? "Password must be at least 6 characters" : ""

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setTouched({ email: true, password: true })
    if (emailError || passwordError || !email || !password) return
    setLoading(true)
    setError("")
    await new Promise((r) => setTimeout(r, 800))
    setLoading(false)
    
    if (login(email, "student")) {
      navigate("/student/dashboard")
    } else {
      setError("Invalid credentials or user not registered.")
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1000))
    setLoading(false)
    setForgotSent(true)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card className="shadow-lg border-slate-100">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">
            {forgotMode ? "Reset Password" : "Student Login"}
          </CardTitle>
          <CardDescription>
            {forgotMode
              ? "Enter your registered email to receive a reset link."
              : "Sign in to access your viva examination portal."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-3 mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {forgotMode ? (
            forgotSent ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-medium text-slate-900 mb-1">Reset link sent!</p>
                <p className="text-sm text-slate-500 mb-4">Check your email inbox for instructions.</p>
                <Button variant="outline" size="sm" onClick={() => { setForgotMode(false); setForgotSent(false) }}>
                  Back to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgot} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email">Email Address</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="your@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send Reset Link
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setForgotMode(false)}>
                  Back to Login
                </Button>
              </form>
            )
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="rollnumber@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  className={emailError ? "border-red-300 focus-visible:ring-red-300" : ""}
                  autoComplete="email"
                />
                {emailError && <p className="text-xs text-red-500">{emailError}</p>}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() => setForgotMode(true)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                    className={passwordError ? "border-red-300 focus-visible:ring-red-300 pr-10" : "pr-10"}
                    autoComplete="current-password"
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
                {passwordError && <p className="text-xs text-red-500">{passwordError}</p>}
              </div>



              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                ) : (
                  "Sign In"
                )}
              </Button>

              <p className="text-center text-xs text-slate-500">
                Don't have an account?{" "}
                <Link to="/student/register" className="text-blue-600 hover:underline font-medium">
                  Create Account
                </Link>
              </p>

              <p className="text-center text-xs text-slate-500">
                Are you faculty?{" "}
                <Link to="/faculty/login" className="text-blue-600 hover:underline font-medium">
                  Faculty Login
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
