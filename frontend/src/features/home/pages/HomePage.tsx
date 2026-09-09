import React from "react"
import { Link } from "react-router-dom"

import { getEnabledModules } from "../../../modules/moduleCatalog"
import { APP_ROUTES } from "../../../routes/routeConstants"

export default function HomePage({ user }) {
  const enabledModules = getEnabledModules(user)

  return (
    <section className="grid gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl">
          <h1 className="m-0 text-3xl font-semibold tracking-tight">Seu Bunker</h1>
          <p className="mt-2 mb-0 text-base text-text-secondary">
            Organize as áreas que fazem sentido para você.
          </p>
        </div>
        <Link
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-control border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-primary no-underline transition-colors hover:border-control-border hover:bg-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          to={APP_ROUTES.SETTINGS}
        >
          Configurar módulos
        </Link>
      </header>

      {enabledModules.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {enabledModules.map((module) => (
            <Link
              key={module.key}
              className="grid min-h-40 content-between rounded-card border border-border bg-surface p-5 text-inherit no-underline transition-colors hover:border-control-border hover:bg-app focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              to={module.route}
            >
              <h2 className="m-0 text-lg font-semibold">{module.label}</h2>
              <p className="m-0 text-sm text-text-secondary">{module.description}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-card border border-border bg-surface p-6 text-center">
          <h2 className="m-0 text-base font-semibold">Nenhum módulo ativo.</h2>
          <p className="mt-2 mb-0 text-sm text-text-secondary">
            Você pode ativar módulos nas Configurações.
          </p>
        </div>
      )}
    </section>
  )
}
