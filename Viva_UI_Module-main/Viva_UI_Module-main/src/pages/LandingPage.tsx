// src/pages/LandingPage.tsx
import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Mic2, BarChart3, Globe, Shield, Zap, Users, GraduationCap,
  ArrowRight, CheckCircle, ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

const features = [
  {
    icon: Mic2,
    title: "AI-Powered Voice Analysis",
    description:
      "Real-time transcription and analysis of student responses with NLP-based concept extraction and scoring.",
    badge: "Core",
  },
  {
    icon: BarChart3,
    title: "Comprehensive Analytics",
    description:
      "Detailed performance dashboards with trend analysis, score distributions, and department-wise comparisons.",
    badge: "Insights",
  },
  {
    icon: Globe,
    title: "Multi-Language Support",
    description:
      "Conduct viva examinations in English, Hindi, Tamil, Telugu, and 4 more regional languages.",
    badge: "Accessibility",
  },
  {
    icon: Shield,
    title: "Academic Integrity",
    description:
      "AI-monitored sessions with anomaly detection to ensure fair, unbiased examination conditions.",
    badge: "Security",
  },
  {
    icon: Zap,
    title: "Instant Evaluation",
    description:
      "Results and detailed feedback generated within minutes of examination completion — no waiting.",
    badge: "Speed",
  },
  {
    icon: Users,
    title: "Faculty Dashboard",
    description:
      "Live monitoring, question bank management, and one-click report generation for faculty members.",
    badge: "Management",
  },
]

const stats = [
  { value: "12,000+", label: "Students Assessed" },
  { value: "98.3%", label: "Evaluation Accuracy" },
  { value: "8", label: "Languages Supported" },
  { value: "340+", label: "Institutions" },
]

const highlights = [
  "Objective and bias-free evaluation",
  "Instant automated scoring",
  "Detailed feedback with improvement areas",
  "Seamless LMS integration",
  "FERPA and data privacy compliant",
  "24/7 available examination system",
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b bg-white/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">VivaAI</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How It Works</a>
            <a href="#stats" className="hover:text-slate-900 transition-colors">Stats</a>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/student/login">Student Login</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/faculty/login">Faculty Login</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/admin/login">Admin Login</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20 md:py-28">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge variant="info" className="mb-6 px-3 py-1">
              AI-Powered Oral Examination Platform
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight mb-6">
              Reimagine Viva Examinations{" "}
              <span className="text-blue-600">with AI</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              VivaAI delivers consistent, objective, and instant oral examination assessment through
              advanced voice recognition, NLP analysis, and intelligent scoring algorithms.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="xl" asChild>
                <Link to="/student/login">
                  Start as Student <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button size="xl" variant="outline" asChild>
                <Link to="/faculty/login">
                  Faculty Portal <ChevronRight className="w-5 h-5" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Separator />

      {/* Stats */}
      <section id="stats" className="bg-slate-900 py-14">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <p className="text-3xl md:text-4xl font-bold text-white">{stat.value}</p>
                <p className="text-slate-400 text-sm mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">Everything You Need</h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            A complete examination ecosystem from question creation to performance insights.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Card className="h-full hover:shadow-md transition-shadow duration-200 border-slate-100">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900">{feature.title}</h3>
                          <Badge variant="muted" className="text-xs">{feature.badge}</Badge>
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-slate-50 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">How VivaAI Works</h2>
            <p className="text-slate-500 text-lg">Simple, structured, and transparent examination flow.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Login & Authenticate", desc: "Secure student login with role verification and session initialization." },
              { step: "02", title: "Read Instructions", desc: "Review examination guidelines, rules, and supported languages before starting." },
              { step: "03", title: "Answer Questions", desc: "Respond to AI-generated questions using voice. Real-time transcript shown." },
              { step: "04", title: "Get Instant Results", desc: "View detailed scores, topic-wise feedback, and improvement recommendations." },
            ].map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mx-auto mb-4">
                  {step.step}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-20 max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Built for Academic Excellence
            </h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              VivaAI eliminates examiner bias, reduces administrative overhead, and ensures every
              student receives a fair, thorough, and consistent oral examination experience.
            </p>
            <ul className="space-y-3">
              {highlights.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-slate-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Communication", score: 85 },
              { label: "Concept Understanding", score: 92 },
              { label: "Accuracy", score: 78 },
              { label: "Fluency", score: 88 },
            ].map((metric) => (
              <Card key={metric.label} className="p-4">
                <p className="text-2xl font-bold text-blue-600">{metric.score}%</p>
                <p className="text-xs text-slate-500 mt-1">{metric.label}</p>
                <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-blue-600 rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${metric.score}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 py-16">
        <div className="max-w-3xl mx-auto text-center px-6">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Examinations?
          </h2>
          <p className="text-slate-400 mb-8">
            Join thousands of institutions already using VivaAI for fairer, faster oral assessments.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="xl" asChild>
              <Link to="/student/login">Student Portal <ArrowRight className="w-4 h-4" /></Link>
            </Button>
            <Button size="xl" variant="outline" className="text-white border-white/20 hover:bg-white/10" asChild>
              <Link to="/faculty/login">Faculty Portal</Link>
            </Button>
            <Button size="xl" variant="outline" className="text-white border-white/20 hover:bg-white/10" asChild>
              <Link to="/admin/login">Admin Portal</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <GraduationCap className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-semibold">VivaAI</span>
          </div>
          <p className="text-xs text-slate-400">© 2024 VivaAI Examination System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
