import React from "react"

export default function StatusNotice({ status }) {
  if (!status?.message) {
    return null
  }

  return <p className={`feedback ${status.type}`}>{status.message}</p>
}
