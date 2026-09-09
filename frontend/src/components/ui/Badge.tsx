import React from "react"

const variants = {
  neutral: "bg-surface-subtle text-text-secondary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  emphasis: "bg-selection text-selection-text",
  danger: "bg-danger-soft text-danger",
}

export default function Badge({ children, className = "", variant = "neutral" }) {
  return (
    <span
      className={`inline-flex items-center rounded-control px-2 py-0.5 text-xs font-medium ${variants[variant] || variants.neutral} ${className}`}
    >
      {children}
    </span>
  )
}
