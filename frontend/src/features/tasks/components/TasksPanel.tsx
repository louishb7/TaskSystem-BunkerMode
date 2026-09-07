import React from "react"

import Button from "../../../components/ui/Button"
import EmptyState from "../../../components/ui/EmptyState"
import { isCompleted } from "../../../utils/taskStatus"
import TaskCard from "./TaskCard"

function isFailure(task) {
  return String(task?.status_code || "").startsWith("FALHA")
}

function groupTasks(tasks) {
  const open = tasks.filter((task) => !isCompleted(task) && !isFailure(task))
  return {
    open: [
      ...open.filter((task) => task?.is_pinned === true),
      ...open.filter((task) => task?.is_pinned !== true),
    ],
    failures: tasks.filter(isFailure),
    completed: tasks.filter(isCompleted),
  }
}

export default function TasksPanel({
  completeLoadingId,
  failLoadingId,
  loading,
  onCompleteTask,
  onCreateTask,
  onDeleteTask,
  onEditTask,
  onFailTask,
  onReopenTask,
  onTogglePin,
  pinLoadingId,
  reopenLoadingId,
  selectedDate,
  selectedTasks,
  timezone,
}) {
  const groups = groupTasks(selectedTasks)
  function renderTaskGroup(label, tasks) {
    if (tasks.length === 0) {
      return null
    }

    return (
      <section className="grid gap-3">
        <h3 className="m-0 text-base font-semibold normal-case text-text-primary">{label}</h3>
        <div className="grid gap-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              completing={completeLoadingId === task.id}
              failing={failLoadingId === task.id}
              task={task}
              onComplete={() => onCompleteTask(task)}
              onDelete={() => onDeleteTask(task)}
              onEdit={() => onEditTask(task)}
              onFail={() => onFailTask(task.id)}
              onReopen={() => onReopenTask(task)}
              onTogglePin={() => onTogglePin(task)}
              pinning={pinLoadingId === task.id}
              reopening={reopenLoadingId === task.id}
              timezone={timezone}
              variant="tasks"
            />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="m-0 text-xl font-semibold normal-case text-text-primary">
            Tarefas de{" "}
            {selectedDate.toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "2-digit",
            })}
          </h2>
        </div>
        <Button onClick={onCreateTask}>Nova tarefa</Button>
      </div>

      {loading ? (
        <EmptyState
          title="Sincronizando tarefas"
          message="Carregando tarefas do dia selecionado."
        />
      ) : selectedTasks.length > 0 ? (
        <div className="grid gap-8">
          {renderTaskGroup("Tarefas abertas", groups.open)}
          {renderTaskGroup("Concluídas", groups.completed)}
          {renderTaskGroup("Falhas registradas", groups.failures)}
        </div>
      ) : (
        <EmptyState
          message="Nenhuma tarefa foi definida para o dia selecionado."
          title="Sem tarefas neste dia"
        />
      )}
    </section>
  )
}
