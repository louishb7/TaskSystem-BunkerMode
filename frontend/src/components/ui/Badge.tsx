import React from "react"

const variants = {
  neutral: "border-border bg-app text-text-secondary",
  success: "border-success/30 bg-success-soft text-success",
  warning: "border-accent/30 bg-accent-soft text-accent-text",
  danger: "border-danger/30 bg-danger-soft text-danger",
}

export default function Badge({ children, className = "", variant = "neutral" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${variants[variant] || variants.neutral} ${className}`}
    >
      {children}
    </span>
  )
}
