import React from "react"

import Button from "./Button"
import Dialog from "./Dialog"

export default function ConfirmDialog({
  cancelLabel = "CANCELAR",
  confirmLabel,
  message,
  loading = false,
  onCancel,
  onConfirm,
  title,
  variant = "danger",
}) {
  return (
    <Dialog closeOnBackdrop={false} onClose={onCancel} title={title}>
      <p className="m-0 text-sm leading-6 text-text-secondary">{message}</p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button disabled={loading} variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button loading={loading} variant={variant === "danger" ? "danger" : "primary"} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  )
}
