import React from "react"

import Badge from "../../../components/ui/Badge"
import Button from "../../../components/ui/Button"
import { isCompleted } from "../../../utils/taskStatus"
import { operationalDateFor } from "../../calendar/calendarUtils"

function can(task, key) {
  return Boolean(task?.permissions?.[key]) && task?.id !== undefined && task?.id !== null
}

function parseTaskDate(value) {
  if (!value || typeof value !== "string") {
    return null
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    const [dayRaw, monthRaw, yearRaw] = value.split("-")
    const day = Number(dayRaw)
    const month = Number(monthRaw)
    const year = Number(yearRaw)
    const parsed = new Date(year, month - 1, day)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [yearRaw, monthRaw, dayRaw] = value.slice(0, 10).split("-")
    const day = Number(dayRaw)
    const month = Number(monthRaw)
    const year = Number(yearRaw)
    const parsed = new Date(year, month - 1, day)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  return null
}

function todayStart(timezone) {
  return operationalDateFor(timezone)
}

function formatDeadline(value, timezone) {
  const parsed = parseTaskDate(value)
  if (!parsed) {
    return "SEM DATA"
  }

  const day = String(parsed.getDate()).padStart(2, "0")
  const month = String(parsed.getMonth() + 1).padStart(2, "0")

  if (parsed.getTime() === todayStart(timezone).getTime()) {
    return "HOJE"
  }

  return `${day}/${month}`
}

function statusText(task) {
  const compact = {
    CONCLUIDA: "",
    FALHA: "FALHOU",
  }
  const statusCode = String(task?.status_code || "").toUpperCase()
  const fallbackLabel = String(task?.status_label || "").trim()

  if (statusCode === "PENDENTE" || fallbackLabel.toUpperCase() === "PENDENTE") {
    return ""
  }

  return compact[statusCode] || fallbackLabel || ""
}

export default function TaskCard({
  completing = false,
  failing = false,
  task,
  onComplete,
  onDelete = undefined,
  onEdit = undefined,
  onFail,
  onReopen = undefined,
  onTogglePin = undefined,
  pinning = false,
  reopening = false,
  timezone = undefined,
  variant = "tasks",
}) {
  const focus = variant === "focus"
  const title = task?.titulo || "Tarefa sem título"
  const instruction = task?.instrucao || ""
  const isPinned = task?.is_pinned === true
  const disabled = pinning || completing || failing || reopening
  const canComplete = can(task, "can_complete")
  const canFail = can(task, "can_fail")
  const canTogglePin = !focus && can(task, "can_pin") && typeof onTogglePin === "function"
  const completed = isCompleted(task)
  const deadlineLabel = formatDeadline(task?.prazo, timezone)
  const failed = String(task?.status_code || "") === "FALHA"
  const currentStatusText = statusText(task)

  if (focus) {
    return (
      <article className="grid gap-4 rounded-card border border-border bg-surface p-4 sm:p-5">
        <div className="min-w-0">
          <h3 className="m-0 break-words text-base font-semibold text-text-primary">{title}</h3>
          {instruction && (
            <p className="mt-2 mb-0 break-words text-sm leading-6 text-text-secondary">
              {instruction}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {isPinned && <Badge variant="emphasis">Prioridade alta</Badge>}
          {task?.recurrence && <Badge>Recorrente</Badge>}
          {completed && <Badge variant="success">Tarefa concluída</Badge>}
          {failed && <Badge variant="danger">Falha registrada</Badge>}
          {!completed && !failed && currentStatusText && <Badge>{currentStatusText}</Badge>}
        </div>

        {(canComplete || canFail) && (
          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:flex-wrap">
            {canComplete && (
              <Button disabled={disabled} loading={completing} onClick={onComplete}>
                Concluir
              </Button>
            )}
            {canFail && (
              <Button
                disabled={disabled}
                loading={failing}
                variant="secondary"
                onClick={() => onFail?.(task.id)}
              >
                Registrar falha
              </Button>
            )}
          </div>
        )}
      </article>
    )
  }

  return (
    <article className="grid gap-4 rounded-card border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="m-0 text-base font-semibold normal-case text-text-primary">{title}</h3>
          {instruction && (
            <p className="mt-2 mb-0 text-sm leading-6 text-text-secondary">{instruction}</p>
          )}
        </div>
        {canTogglePin && (
          <Button
            aria-label={isPinned ? "Remover prioridade" : "Elevar prioridade"}
            disabled={disabled}
            size="small"
            variant="ghost"
            onClick={() => onTogglePin(task)}
          >
            {isPinned ? "Prioridade alta" : "Priorizar"}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {isPinned && <Badge variant="emphasis">Prioridade alta</Badge>}
        {deadlineLabel && (
          <Badge variant="neutral">{deadlineLabel === "HOJE" ? "Hoje" : deadlineLabel}</Badge>
        )}
        {task?.recurrence && <Badge>Recorrente</Badge>}
        {completed && <Badge variant="success">Concluída</Badge>}
        {failed && <Badge variant="danger">Falha registrada</Badge>}
        {!completed && !failed && currentStatusText && <Badge>{currentStatusText}</Badge>}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        {canComplete && (
          <Button loading={completing} size="small" onClick={onComplete}>
            Concluir
          </Button>
        )}
        {canFail && (
          <Button
            loading={failing}
            size="small"
            variant="secondary"
            onClick={() => onFail?.(task.id)}
          >
            Registrar falha
          </Button>
        )}
        {can(task, "can_edit") && (
          <Button disabled={disabled} size="small" variant="ghost" onClick={onEdit}>
            Editar
          </Button>
        )}
        {can(task, "can_delete") && (
          <Button disabled={disabled} size="small" variant="danger" onClick={onDelete}>
            Remover
          </Button>
        )}
        {can(task, "can_reopen") && onReopen && (
          <Button loading={reopening} size="small" variant="secondary" onClick={onReopen}>
            Reabrir
          </Button>
        )}
      </div>
    </article>
  )
}
