import React from "react"

export default function StatusNotice({ status }) {
  if (!status?.message) {
    return null
  }

  const isError = status.type === "error"
  const variants = {
    error: "border-danger bg-danger-soft text-danger",
    success: "border-success bg-success-soft text-success",
    warning: "border-warning bg-warning-soft text-warning",
  }

  return (
    <p
      aria-live={isError ? "assertive" : "polite"}
      className={`m-0 border-l-2 px-3 py-2 text-sm leading-6 ${variants[status.type] || "border-border-strong bg-surface-subtle text-text-secondary"}`}
      role={isError ? "alert" : "status"}
    >
      {status.message}
    </p>
  )
}
