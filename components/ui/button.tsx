import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 ease-apple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] hover:scale-[1.02] transform-gpu",
  {
    variants: {
      variant: {
        default: "bg-[#fbb305] text-black hover:bg-[#fbb305]/90 shadow-lg shadow-[#fbb305]/20 hover:shadow-xl hover:shadow-[#fbb305]/30",
        outline: "border border-[#fbb305]/20 bg-black/40 hover:bg-black/60 hover:border-[#fbb305]/40 text-[#fbb305] backdrop-blur-sm hover:shadow-lg hover:shadow-[#fbb305]/10",
        ghost: "hover:bg-zinc-800 text-gray-300 hover:shadow-md",
        secondary: "bg-zinc-800 text-white hover:bg-zinc-700 hover:shadow-lg",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
