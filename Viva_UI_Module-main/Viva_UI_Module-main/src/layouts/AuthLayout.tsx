// src/layouts/AuthLayout.tsx
import { Outlet } from "react-router-dom"
import { GraduationCap } from "lucide-react"

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg">VivaAI</p>
            <p className="text-white/50 text-xs">Examination System</p>
          </div>
        </div>

        <div>
          <blockquote className="text-white/70 text-lg font-light leading-relaxed mb-6 italic">
            "Transforming oral examinations through intelligent assessment — objective, fair, and consistent evaluation for every student."
          </blockquote>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Students Assessed", value: "12,000+" },
              { label: "Accuracy Rate", value: "98.3%" },
              { label: "Languages", value: "8" },
            ].map((stat) => (
              <div key={stat.label} className="border border-white/10 rounded-lg p-3">
                <p className="text-white font-bold text-xl">{stat.value}</p>
                <p className="text-white/50 text-xs mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/30 text-xs">
          © 2024 VivaAI · AI-Powered Examination System
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-lg">VivaAI</p>
              <p className="text-muted-foreground text-xs">Examination System</p>
            </div>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
