import React from "react"

import Button from "../../../components/ui/Button"
import Dialog from "../../../components/ui/Dialog"
import { formatCurrentDay } from "../../calendar/calendarUtils"

export default function StartFocusDialog({
  loading,
  onCancel,
  onConfirm,
  todayTasks = [],
  timezone,
}) {
  const completedTasks = todayTasks.filter(
    (task) => String(task?.status_code || "").toUpperCase() === "CONCLUIDA"
  )
  const pendingTasks = todayTasks.filter((task) => {
    const statusCode = String(task?.status_code || "").toUpperCase()
    return !statusCode.startsWith("FALHA") && statusCode !== "CONCLUIDA"
  })

  return (
    <Dialog closeOnBackdrop={false} onClose={onCancel} title="Iniciar foco">
      <div className="grid gap-4">
        <p className="m-0 text-sm text-text-secondary">{formatCurrentDay(timezone)}</p>
        <p className="m-0 text-sm font-medium text-text-primary">Tarefas de hoje</p>
        {todayTasks.length > 0 ? (
          <ul className="m-0 grid list-none gap-2 rounded-control border border-border bg-app p-3 text-sm text-text-primary">
            {pendingTasks.map((task) => (
              <li key={task.id}>{task?.titulo || "Tarefa sem título"}</li>
            ))}
            {completedTasks.map((task) => (
              <li className="text-text-secondary line-through" key={task.id}>
                {task?.titulo || "Tarefa sem título"}
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-control border border-border bg-app p-3 text-sm text-text-secondary">
            Nenhuma tarefa definida para hoje
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button disabled={loading} variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button loading={loading} onClick={onConfirm}>
            {loading ? "Iniciando" : "Iniciar foco"}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
