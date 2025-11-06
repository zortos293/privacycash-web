import * as React from "react"
import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white placeholder:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbb305] focus-visible:ring-offset-2 focus-visible:border-[#fbb305] disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 ease-apple hover:border-zinc-700 focus:scale-[1.01] transform-gpu",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
