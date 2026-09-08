import React from "react"

export default function PageHeader({ actions, description, title }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="m-0 text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 mb-0 max-w-2xl text-sm leading-6 text-text-secondary">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  )
}
