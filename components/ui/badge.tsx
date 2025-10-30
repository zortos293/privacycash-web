import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 ease-apple focus:outline-none focus:ring-2 focus:ring-offset-2 hover:scale-105 transform-gpu",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#fbb305]/10 text-[#fbb305] border-[#fbb305]/20 hover:bg-[#fbb305]/20",
        completed: "border-transparent bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20",
        failed: "border-transparent bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20",
        processing: "border-transparent bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20",
        queued: "border-transparent bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20",
        outline: "text-gray-400 border-zinc-700 hover:border-zinc-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
