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
  selectedDate = undefined,
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
  const taskDate = parseTaskDate(task?.prazo)
  const deadlineMatchesSelection =
    taskDate && selectedDate && taskDate.getTime() === selectedDate.getTime()
  const showDeadline = deadlineLabel && !deadlineMatchesSelection && deadlineLabel !== "HOJE"
  const showMetadata = isPinned || showDeadline || Boolean(task?.recurrence)

  if (focus) {
    return (
      <article className="grid gap-4 border-b border-border py-5 sm:py-6">
        <div className="min-w-0">
          <h3 className="m-0 break-words text-lg font-semibold tracking-tight text-text-primary sm:text-xl">
            {title}
          </h3>
          {instruction && (
            <p className="mt-2 mb-0 max-w-2xl break-words text-sm leading-6 text-text-secondary sm:text-base">
              {instruction}
            </p>
          )}
        </div>

        {(isPinned || completed || failed || currentStatusText) && (
          <p className="m-0 text-xs font-medium tracking-wide text-text-muted uppercase">
            {completed
              ? "Concluída"
              : failed
                ? "Falha registrada"
                : currentStatusText || (isPinned ? "Prioridade alta" : "")}
          </p>
        )}

        {(canComplete || canFail) && (
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
            {canComplete && (
              <Button
                className="max-sm:min-h-11 sm:min-w-28"
                disabled={disabled}
                loading={completing}
                onClick={onComplete}
              >
                Concluir
              </Button>
            )}
            {canFail && (
              <Button
                className="max-sm:min-h-11"
                disabled={disabled}
                loading={failing}
                variant="ghost"
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
    <article className="grid gap-3 border-b border-border px-0 py-4 transition-colors hover:bg-surface-subtle sm:px-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3
            className={`m-0 break-words text-base font-semibold normal-case ${completed ? "text-text-secondary line-through decoration-border-strong" : "text-text-primary"}`}
          >
            {title}
          </h3>
          {instruction && (
            <p className="mt-1.5 mb-0 break-words text-sm leading-5 text-text-secondary">
              {instruction}
            </p>
          )}
        </div>
        {canTogglePin && (
          <Button
            aria-label={isPinned ? "Remover prioridade" : "Elevar prioridade"}
            className="max-sm:min-h-11"
            disabled={disabled}
            size="small"
            variant="ghost"
            onClick={() => onTogglePin(task)}
          >
            {isPinned ? "Remover prioridade" : "Priorizar"}
          </Button>
        )}
      </div>

      {showMetadata && (
        <div className="flex flex-wrap items-center gap-2">
          {isPinned && <Badge variant="emphasis">Prioridade alta</Badge>}
          {showDeadline && <Badge variant="neutral">Prazo {deadlineLabel}</Badge>}
          {task?.recurrence && <Badge>Recorrente</Badge>}
        </div>
      )}

      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {canComplete && (
            <Button
              className="max-sm:min-h-11"
              loading={completing}
              size="small"
              onClick={onComplete}
            >
              Concluir
            </Button>
          )}
          {canFail && (
            <Button
              loading={failing}
              className="max-sm:min-h-11"
              size="small"
              variant="secondary"
              onClick={() => onFail?.(task.id)}
            >
              Registrar falha
            </Button>
          )}
          {can(task, "can_reopen") && onReopen && (
            <Button
              className="max-sm:min-h-11"
              loading={reopening}
              size="small"
              variant="secondary"
              onClick={onReopen}
            >
              Reabrir
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-1 sm:justify-end">
          {can(task, "can_edit") && (
            <Button
              className="max-sm:min-h-11"
              disabled={disabled}
              size="small"
              variant="ghost"
              onClick={onEdit}
            >
              Editar
            </Button>
          )}
          {can(task, "can_delete") && (
            <Button
              className="max-sm:min-h-11"
              disabled={disabled}
              size="small"
              variant="danger"
              onClick={onDelete}
            >
              Remover
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}
