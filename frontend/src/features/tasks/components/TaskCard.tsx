import React from "react"
import { Check, Circle, Repeat2, Pin, RotateCcw } from "lucide-react"
import Button from "../../../components/ui/Button"
import { operationalDateFor, normalizeTaskDate } from "../../calendar/calendarUtils"
import Badge from "../../../components/ui/Badge"
import ActionsMenu from "../../../components/ui/ActionsMenu"
import { isCompleted, isNotPerformed } from "../../../utils/taskStatus"

export default function TaskCard({
  completing = false,
  task,
  onComplete,
  onDelete = undefined,
  onEdit = undefined,
  onReopen = undefined,
  onTogglePin = undefined,
  pinning = false,
  reopening = false,
  selectedDate = undefined,
  timezone = undefined,
  variant = "tasks",
}) {
  const title = task?.titulo || "Tarefa sem título"
  const completed = isCompleted(task)
  const notPerformed = isNotPerformed(task)
  const permissions = task?.id !== undefined && task?.id !== null ? task.permissions || {} : {}
  const busy = completing || pinning || reopening
  const focus = variant === "focus"
  const administrative = [
    ...(permissions.can_edit && onEdit ? [{ label: "Editar", onSelect: onEdit }] : []),
    ...(permissions.can_pin && onTogglePin
      ? [
          {
            label: task.is_pinned ? "Remover prioridade" : "Priorizar",
            onSelect: () => onTogglePin(task),
          },
        ]
      : []),
    ...(permissions.can_delete && onDelete
      ? [{ label: "Remover", onSelect: onDelete, danger: true }]
      : []),
  ]
  // O contexto de prazo continua disponível quando a tarefa aparece no dia da conclusão.
  const deadline = normalizeTaskDate(task?.prazo).replaceAll("-", "/")
  const selected = (selectedDate || operationalDateFor(timezone)).toLocaleDateString("pt-BR")
  const showDeadline = deadline && selected && deadline !== selected
  return (
    <article
      className={`group relative border-b border-border last:border-b-0 ${focus ? "px-5 py-6 sm:px-7" : "px-3 py-3 sm:px-5"}`}
    >
      <div className={`flex items-start ${focus ? "gap-4" : "gap-2 sm:gap-3"}`}>
        {!focus && (
          <div className="shrink-0">
            {permissions.can_complete ? (
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Concluir: ${title}`}
                title="Concluir tarefa"
                disabled={busy}
                loading={completing}
                onClick={onComplete}
              >
                <Circle
                  size={23}
                  className="text-text-muted group-hover:text-accent"
                  aria-hidden="true"
                />
              </Button>
            ) : (
              <span
                className={`grid size-11 place-items-center ${completed ? "text-success" : "text-text-muted"}`}
              >
                {completed ? (
                  <Check size={21} aria-hidden="true" />
                ) : (
                  <Circle size={21} aria-hidden="true" />
                )}
                <span className="sr-only">{completed ? "Concluída" : "Sem ação disponível"}</span>
              </span>
            )}
          </div>
        )}
        <div className="min-w-0 flex-1 pt-2">
          <h3
            className={`m-0 break-words font-semibold leading-6 ${focus ? "text-xl tracking-tight" : "text-sm sm:text-base"} ${completed ? "text-text-secondary" : "text-text-primary"}`}
          >
            {title}
          </h3>
          {task?.instrucao && (
            <p
              className={`mt-1.5 mb-0 break-words leading-6 text-text-secondary ${focus ? "text-base" : "text-sm"}`}
            >
              {task.instrucao}
            </p>
          )}
          {((!focus && (task.is_pinned || task.recurrence)) ||
            notPerformed ||
            showDeadline ||
            (focus && completed)) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-muted">
              {notPerformed && <Badge>Não realizada</Badge>}
              {focus && completed && <span className="text-success">Concluída</span>}
              {!focus && task.is_pinned && (
                <span className="inline-flex items-center gap-1">
                  <Pin size={12} aria-hidden="true" />
                  Prioridade alta
                </span>
              )}
              {!focus && task.recurrence && (
                <span className="inline-flex items-center gap-1">
                  <Repeat2 size={13} aria-hidden="true" />
                  Recorrente
                </span>
              )}
              {showDeadline && <span>Prazo {deadline}</span>}
            </div>
          )}
          {focus && permissions.can_complete && (
            <Button className="mt-5" loading={completing} disabled={busy} onClick={onComplete}>
              <Check size={18} aria-hidden="true" />
              Concluir
            </Button>
          )}
          {!focus && permissions.can_reopen && onReopen && (
            <Button size="small" variant="ghost" loading={reopening} onClick={onReopen}>
              <RotateCcw size={14} aria-hidden="true" />
              Reabrir
            </Button>
          )}
        </div>
        {!focus && administrative.length > 0 && (
          <ActionsMenu label={`Ações da tarefa: ${title}`} disabled={busy} items={administrative} />
        )}
      </div>
    </article>
  )
}
