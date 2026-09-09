import React from "react"

import EmptyState from "../../../components/ui/EmptyState"
import ObjetivoCard from "./ObjetivoCard"

export default function ObjetivoList({
  tasksEnabled,
  loading,
  tasksByObjetivo,
  tasksLoading,
  tasksError,
  onRetryTasks,
  objetivos,
  onCreate,
  onCreateTask,
  onDelete,
  onEdit,
  onMoveToTop,
  onUpdateStatus,
}) {
  if (objetivos.length === 0) {
    return (
      <EmptyState
        actionLabel="Criar objetivo"
        message="Crie um objetivo para definir o que você quer alcançar."
        onAction={onCreate}
        title="Nenhum objetivo ainda"
      />
    )
  }

  return (
    <div className="grid border-t border-border">
      {objetivos.map((objetivo, index) => (
        <ObjetivoCard
          tasksEnabled={tasksEnabled}
          key={objetivo.id}
          loading={loading}
          tasks={tasksByObjetivo[String(objetivo.id)] || []}
          tasksLoading={tasksLoading}
          tasksError={tasksError}
          onRetryTasks={onRetryTasks}
          objetivo={objetivo}
          onCreateTask={() => onCreateTask(objetivo)}
          onDelete={() => onDelete(objetivo)}
          onEdit={() => onEdit(objetivo)}
          onMoveToTop={index > 0 ? () => onMoveToTop(objetivo.id) : null}
          onUpdateStatus={(status) => onUpdateStatus(objetivo.id, status)}
        />
      ))}
    </div>
  )
}
