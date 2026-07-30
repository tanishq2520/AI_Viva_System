// src/components/common/StatCard.tsx
import { motion } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/utils/cn"
import { Card, CardContent } from "@/components/ui/card"

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: "positive" | "negative" | "neutral"
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  description?: string
  index?: number
}

export function StatCard({
  title, value, change, changeType = "neutral", icon: Icon,
  iconColor = "text-blue-600", iconBg = "bg-blue-50",
  description, index = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
    >
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold mt-1 text-foreground">{value}</p>
              {(change || description) && (
                <p className={cn(
                  "text-xs mt-1.5 font-medium",
                  changeType === "positive" ? "text-green-600" :
                  changeType === "negative" ? "text-red-500" :
                  "text-muted-foreground"
                )}>
                  {change || description}
                </p>
              )}
            </div>
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", iconBg)}>
              <Icon className={cn("w-5 h-5", iconColor)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
