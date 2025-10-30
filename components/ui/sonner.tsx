"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-zinc-900 group-[.toaster]:text-white group-[.toaster]:border-zinc-800 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-gray-400",
          actionButton:
            "group-[.toast]:bg-[#fbb305] group-[.toast]:text-black group-[.toast]:hover:bg-[#fbb305]/90",
          cancelButton:
            "group-[.toast]:bg-zinc-800 group-[.toast]:text-gray-400",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
