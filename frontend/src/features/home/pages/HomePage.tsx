import React from "react"
import { Link } from "react-router-dom"

import { MODULE_CATALOG } from "../../../modules/moduleCatalog"

export default function HomePage() {
  return (
    <section className="grid gap-8">
      <header className="max-w-xl">
        <h1 className="m-0 text-3xl font-semibold tracking-tight">Seu Bunker</h1>
        <p className="mt-2 mb-0 text-base text-text-secondary">
          Organize as áreas que fazem sentido para você.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {MODULE_CATALOG.map((module) => (
          <Link
            key={module.key}
            className="grid min-h-40 content-between rounded-card border border-border bg-surface p-5 text-inherit no-underline transition-colors hover:border-control-border hover:bg-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            to={module.route}
          >
            <h2 className="m-0 text-lg font-semibold">{module.label}</h2>
            <p className="m-0 text-sm text-text-secondary">{module.description}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
