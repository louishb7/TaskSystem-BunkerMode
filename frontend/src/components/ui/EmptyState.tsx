import React from "react"

import Button from "./Button"

type EmptyStateProps = {
  actionLabel?: string
  flat?: boolean
  message: string
  onAction?: () => void
  title: string
}

export default function EmptyState({ actionLabel, flat = false, message, onAction, title }: EmptyStateProps) {
  return (
    <div className={`grid justify-items-center gap-2 border p-6 text-center ${flat ? "border-transparent bg-transparent" : "rounded-card border-border bg-surface"}`}>
      <h3 className="m-0 text-base font-semibold text-text-primary">{title}</h3>
      <p className="m-0 max-w-lg text-sm leading-6 text-text-secondary">{message}</p>
      {actionLabel && onAction && (
        <Button className="mt-2" size="small" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
