import React from "react"

import Button from "../../../components/ui/Button"
import { normalizeTaskDate } from "../../calendar/calendarUtils"

const statusLabels = {
  ativo: "Ativo",
  pausado: "Pausado",
  abandonado: "Abandonado",
  concluido: "Concluído",
}

const taskStatus = {
  PENDENTE: { label: "Em aberto", className: "text-text-secondary" },
  CONCLUIDA: { label: "Concluída", className: "text-success" },
  FALHA: { label: "Falha registrada", className: "text-danger" },
}

function formatDateOnly(value, fallback) {
  const normalized = normalizeTaskDate(value)
  if (!/^\d{2}-\d{2}-\d{4}$/.test(normalized)) {
    return fallback
  }

  const [day, month, year] = normalized.split("-")
  return `${day}/${month}/${year}`
}

function getTaskStatus(task) {
  const statusCode = String(task?.status_code || "").toUpperCase()
  return (
    taskStatus[statusCode] || {
      label: task?.status_label || "Sem status",
      className: "text-text-secondary",
    }
  )
}

export default function ObjetivoCard({
  tasksEnabled,
  loading,
  tasks,
  tasksLoading,
  tasksError,
  onRetryTasks,
  objetivo,
  onCreateTask,
  onDelete,
  onEdit,
  onMoveToTop,
  onUpdateStatus,
}) {
  const targetDate = objetivo.data_alvo ? formatDateOnly(objetivo.data_alvo, "") : ""

  return (
    <article className="grid gap-5 border-b border-border py-6 sm:py-7">
      <header className="grid gap-3">
        <div className="min-w-0">
          <h2 className="m-0 max-w-3xl break-words text-xl font-semibold leading-tight tracking-tight text-text-primary sm:text-2xl">
            {objetivo.titulo}
          </h2>
          {objetivo.descricao && (
            <p className="mt-3 mb-0 max-w-3xl break-words text-sm leading-6 text-text-secondary sm:text-base">
              {objetivo.descricao}
            </p>
          )}
        </div>
      </header>

      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        <label
          className="grid gap-1 text-xs font-medium text-text-secondary"
          htmlFor={`objetivo-status-${objetivo.id}`}
        >
          Status
          <select
            className="min-h-9 rounded-control border border-control-border bg-surface px-2 text-sm font-medium text-text-primary focus-visible:border-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:bg-app disabled:text-text-secondary disabled:opacity-70"
            disabled={loading}
            id={`objetivo-status-${objetivo.id}`}
            value={objetivo.status}
            onChange={(event) => onUpdateStatus(event.target.value)}
          >
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {targetDate && (
          <p className="m-0 pb-2 text-sm text-text-secondary">
            <span className="font-medium text-text-primary">Prazo </span>
            {targetDate}
          </p>
        )}
      </div>

      {tasksEnabled && (
        <section
          className="grid gap-3 border-t border-border pt-5"
          aria-labelledby={`objetivo-orders-${objetivo.id}`}
        >
          <h3
            id={`objetivo-orders-${objetivo.id}`}
            className="m-0 text-sm font-semibold text-text-primary"
          >
            Tarefas vinculadas
          </h3>
          {tasksLoading ? (
            <p className="m-0 text-sm text-text-secondary">Carregando tarefas vinculadas…</p>
          ) : tasksError ? (
            <div className="grid gap-2" role="status">
              <p className="m-0 text-sm text-text-secondary">
                Tarefas vinculadas indisponíveis. {tasksError} Você pode continuar administrando
                este objetivo.
              </p>
              <Button variant="ghost" onClick={onRetryTasks}>
                Tentar novamente
              </Button>
            </div>
          ) : tasks.length > 0 ? (
            <ul className="m-0 grid list-none border-y border-border p-0">
              {tasks.map((task) => {
                const status = getTaskStatus(task)
                const taskDate = task?.prazo ? formatDateOnly(task.prazo, "") : ""
                return (
                  <li
                    className="flex flex-col gap-1 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-5"
                    key={task.id}
                  >
                    <span className="min-w-0 break-words text-sm font-medium text-text-primary">
                      {task.titulo || "Tarefa sem título"}
                    </span>
                    <span className="flex shrink-0 flex-wrap gap-x-3 text-xs text-text-secondary">
                      {taskDate && <span>{taskDate}</span>}
                      <span className={status.className}>{status.label}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="m-0 text-sm text-text-secondary">Nenhuma tarefa vinculada.</p>
          )}
          <Button
            className="justify-self-start"
            size="small"
            variant="secondary"
            onClick={onCreateTask}
          >
            Nova tarefa vinculada
          </Button>
        </section>
      )}

      <div className="flex flex-wrap gap-1 border-t border-border pt-4">
        <Button
          className="max-sm:min-h-11"
          disabled={loading}
          size="small"
          variant="ghost"
          onClick={onEdit}
        >
          Editar
        </Button>
        {onMoveToTop && (
          <Button
            className="max-sm:min-h-11"
            disabled={loading}
            size="small"
            variant="ghost"
            onClick={onMoveToTop}
          >
            Mover para o início
          </Button>
        )}
        <Button
          className="max-sm:min-h-11"
          disabled={loading}
          size="small"
          variant="danger"
          onClick={onDelete}
        >
          Remover
        </Button>
      </div>
    </article>
  )
}
