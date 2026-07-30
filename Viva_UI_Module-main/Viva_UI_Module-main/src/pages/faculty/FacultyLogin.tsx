// src/pages/faculty/FacultyLogin.tsx
import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/AuthContext"
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function FacultyLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [department, setDepartment] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password || !department) {
      setError("Please fill in all fields.")
      return
    }
    setLoading(true)
    setError("")
    await new Promise((r) => setTimeout(r, 800))
    setLoading(false)
    
    if (login(email, "faculty")) {
      navigate("/faculty/dashboard")
    } else {
      setError("Invalid credentials or user not registered.")
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card className="shadow-lg border-slate-100">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Faculty Login</CardTitle>
          <CardDescription>
            Sign in to access the faculty administration portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-3 mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="faculty-email">Faculty Email</Label>
              <Input
                id="faculty-email"
                type="email"
                placeholder="faculty@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="faculty-dept">Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger id="faculty-dept">
                  <SelectValue placeholder="Select your department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cs">Computer Science</SelectItem>
                  <SelectItem value="it">Information Technology</SelectItem>
                  <SelectItem value="ece">Electronics & Communication</SelectItem>
                  <SelectItem value="me">Mechanical Engineering</SelectItem>
                  <SelectItem value="civil">Civil Engineering</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="faculty-password">Password</Label>
              <div className="relative">
                <Input
                  id="faculty-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
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
            </div>



            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
              ) : (
                "Sign In to Faculty Portal"
              )}
            </Button>

            <p className="text-center text-xs text-slate-500">
              Don't have an account?{" "}
              <Link to="/faculty/register" className="text-blue-600 hover:underline font-medium">
                Register Faculty Account
              </Link>
            </p>

            <p className="text-center text-xs text-slate-500">
              Are you a student?{" "}
              <Link to="/student/login" className="text-blue-600 hover:underline font-medium">
                Student Login
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}
