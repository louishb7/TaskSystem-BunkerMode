import React from "react"

export default function EmptyState({ flat = false, message, title }) {
  return (
    <div className={`empty-state ${flat ? "flat" : ""}`}>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  )
}
