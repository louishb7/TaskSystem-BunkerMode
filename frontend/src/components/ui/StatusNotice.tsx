import React from "react"

export default function StatusNotice({ status }) {
  if (!status?.message) {
    return null
  }

  const isError = status.type === "error"
  const variants = {
    error: "border-danger/40 bg-danger-soft text-danger",
    success: "border-success/35 bg-success-soft text-success",
    warning: "border-accent/35 bg-accent-soft text-accent-text",
  }

  return (
    <p
      aria-live={isError ? "assertive" : "polite"}
      className={`m-0 rounded-control border px-3 py-2 text-sm leading-6 ${variants[status.type] || "border-border bg-app text-text-secondary"}`}
      role={isError ? "alert" : "status"}
    >
      {status.message}
    </p>
  )
}
