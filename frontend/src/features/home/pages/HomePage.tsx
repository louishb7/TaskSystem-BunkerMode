import React, { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { getErrorMessage } from "../../../api/httpClient"
import StatusNotice from "../../../components/ui/StatusNotice"
import { getEnabledModules } from "../../../modules/moduleCatalog"
import { APP_ROUTES } from "../../../routes/routeConstants"
import { api } from "../../../services/bunkermodeApi"

const emptyPreview = { error: "", items: [], loading: false }

export function selectHomeTasks(tasks = []) {
  return tasks.filter((task) => task?.status_code === "PENDENTE").slice(0, 3)
}

export function selectHomeObjectives(objetivos = []) {
  return objetivos
    .filter((objetivo) => objetivo?.status !== "concluido" && objetivo?.status !== "abandonado")
    .slice(0, 2)
}

function CompartmentLink({ children, to }) {
  return (
    <Link
      className="inline-flex min-h-11 items-center text-sm font-semibold text-text-primary underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      to={to}
    >
      {children}
    </Link>
  )
}

function TasksCompartment({ preview }) {
  return (
    <section aria-labelledby="home-tasks-title" className="grid content-start gap-5 py-7 lg:py-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="m-0 text-xs font-semibold tracking-[0.16em] text-text-muted uppercase">
            Tarefas
          </p>
          <h2 id="home-tasks-title" className="mt-2 mb-0 text-xl font-semibold tracking-tight">
            Hoje
          </h2>
        </div>
        <CompartmentLink to={APP_ROUTES.TASKS}>Ver tarefas</CompartmentLink>
      </div>

      {preview.loading && (
        <p aria-live="polite" className="m-0 py-4 text-sm text-text-secondary" role="status">
          Carregando tarefas de hoje…
        </p>
      )}

      {!preview.loading && preview.error && (
        <StatusNotice status={{ type: "error", message: preview.error }} />
      )}

      {!preview.loading && !preview.error && preview.items.length === 0 && (
        <p className="m-0 border-t border-border py-5 text-sm leading-6 text-text-secondary">
          Nenhuma tarefa aberta para hoje.
        </p>
      )}

      {!preview.loading && !preview.error && preview.items.length > 0 && (
        <ul className="m-0 grid list-none border-t border-border">
          {preview.items.map((task) => (
            <li
              className="border-b border-border py-3 text-sm font-medium text-text-primary"
              key={task.id}
            >
              {task.titulo}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ObjectivesCompartment({ preview }) {
  return (
    <section
      aria-labelledby="home-objectives-title"
      className="grid content-start gap-6 py-7 lg:py-0"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="m-0 text-xs font-semibold tracking-[0.16em] text-text-muted uppercase">
            Objetivos
          </p>
          <h2 id="home-objectives-title" className="mt-2 mb-0 text-xl font-semibold tracking-tight">
            Em andamento
          </h2>
        </div>
        <CompartmentLink to={APP_ROUTES.OBJECTIVES}>Ver objetivos</CompartmentLink>
      </div>

      {preview.loading && (
        <p aria-live="polite" className="m-0 py-4 text-sm text-text-secondary" role="status">
          Carregando objetivos…
        </p>
      )}

      {!preview.loading && preview.error && (
        <StatusNotice status={{ type: "error", message: preview.error }} />
      )}

      {!preview.loading && !preview.error && preview.items.length === 0 && (
        <p className="m-0 border-t border-border py-5 text-sm leading-6 text-text-secondary">
          Nenhum objetivo em andamento.
        </p>
      )}

      {!preview.loading && !preview.error && preview.items.length > 0 && (
        <ol className="m-0 grid list-none border-t border-border">
          {preview.items.map((objetivo) => (
            <li className="border-b border-border py-4" key={objetivo.id}>
              <h3 className="m-0 break-words text-base font-semibold text-text-primary">
                {objetivo.titulo}
              </h3>
              {objetivo.descricao && (
                <p className="mt-2 mb-0 break-words text-sm leading-6 text-text-secondary">
                  {objetivo.descricao}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export default function HomePage({ onUnauthorized, token, user }) {
  const enabledModules = getEnabledModules(user)
  const tasksEnabled = enabledModules.some((module) => module.key === "tasks")
  const objectivesEnabled = enabledModules.some((module) => module.key === "objectives")
  const [tasksPreview, setTasksPreview] = useState(emptyPreview)
  const [objectivesPreview, setObjectivesPreview] = useState(emptyPreview)

  useEffect(() => {
    let cancelled = false

    if (!tasksEnabled || !token) {
      setTasksPreview(emptyPreview)
      return () => {
        cancelled = true
      }
    }

    async function loadTasks() {
      setTasksPreview({ error: "", items: [], loading: true })
      const materialization = await api.materializeTaskRecurrences(token)
      if (cancelled || onUnauthorized?.(materialization)) {
        return
      }

      if (!materialization.ok) {
        setTasksPreview({
          error: getErrorMessage(materialization, "Não foi possível preparar as tarefas de hoje."),
          items: [],
          loading: false,
        })
        return
      }

      const result = await api.listDailyTasks(token)
      if (cancelled || onUnauthorized?.(result)) {
        return
      }

      if (!result.ok) {
        setTasksPreview({
          error: getErrorMessage(result, "Não foi possível carregar as tarefas de hoje."),
          items: [],
          loading: false,
        })
        return
      }

      setTasksPreview({ error: "", items: selectHomeTasks(result.data), loading: false })
    }

    void loadTasks()
    return () => {
      cancelled = true
    }
  }, [onUnauthorized, tasksEnabled, token])

  useEffect(() => {
    let cancelled = false

    if (!objectivesEnabled || !token) {
      setObjectivesPreview(emptyPreview)
      return () => {
        cancelled = true
      }
    }

    async function loadObjectives() {
      setObjectivesPreview({ error: "", items: [], loading: true })
      const result = await api.listObjetivos(token)
      if (cancelled || onUnauthorized?.(result)) {
        return
      }

      if (!result.ok) {
        setObjectivesPreview({
          error: getErrorMessage(result, "Não foi possível carregar objetivos."),
          items: [],
          loading: false,
        })
        return
      }

      const objetivos = Array.isArray(result.data) ? result.data : []
      setObjectivesPreview({ error: "", items: selectHomeObjectives(objetivos), loading: false })
    }

    void loadObjectives()
    return () => {
      cancelled = true
    }
  }, [objectivesEnabled, onUnauthorized, token])

  return (
    <section className="grid gap-0">
      <header className="grid gap-5 border-b border-border pb-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="max-w-xl">
          <h1 className="m-0 text-3xl font-semibold tracking-tight">Seu Bunker</h1>
          <p className="mt-2 mb-0 text-base leading-6 text-text-secondary">
            Veja o que está presente nos seus módulos.
          </p>
        </div>
        {enabledModules.length > 0 && (
          <Link
            className="inline-flex min-h-11 items-center text-sm font-medium text-text-secondary underline decoration-border underline-offset-4 transition-colors hover:text-text-primary hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            to={APP_ROUTES.SETTINGS}
          >
            Configurar módulos
          </Link>
        )}
      </header>

      {enabledModules.length === 0 ? (
        <section className="grid max-w-xl gap-3 py-8" aria-labelledby="home-empty-title">
          <h2 id="home-empty-title" className="m-0 text-xl font-semibold tracking-tight">
            Nenhuma ferramenta habilitada
          </h2>
          <p className="m-0 text-sm leading-6 text-text-secondary">
            Ative Tarefas ou Objetivos para começar a organizar o seu Bunker.
          </p>
          <CompartmentLink to={APP_ROUTES.SETTINGS}>Abrir configurações</CompartmentLink>
        </section>
      ) : (
        <div
          className={`grid ${tasksEnabled && objectivesEnabled ? "lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:gap-10" : "max-w-3xl"}`}
        >
          {tasksEnabled && <TasksCompartment preview={tasksPreview} />}
          {objectivesEnabled && (
            <div
              className={
                tasksEnabled ? "border-t border-border lg:border-t-0 lg:border-l lg:pl-10" : ""
              }
            >
              <ObjectivesCompartment preview={objectivesPreview} />
            </div>
          )}
        </div>
      )}
    </section>
  )
}
