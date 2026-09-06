import React, { useState } from "react"

import Button from "../ui/Button"

export default function ExecutionLayout({ children, onReturnToGeneral }) {
  const [returnLoading, setReturnLoading] = useState(false)

  async function handleReturn() {
    setReturnLoading(true)
    await onReturnToGeneral()
    setReturnLoading(false)
  }

  return (
    <div className="min-h-dvh bg-app text-text-primary">
      <header className="border-b border-border bg-sidebar">
        <div className="mx-auto flex min-h-14 w-full max-w-[760px] items-center justify-between gap-4 px-4 sm:px-6">
          <span className="text-base font-semibold tracking-tight">BunkerMode</span>
          <Button loading={returnLoading} size="small" variant="ghost" onClick={handleReturn}>
            Voltar ao General
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[760px] px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  )
}
