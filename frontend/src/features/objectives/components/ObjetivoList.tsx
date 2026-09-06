import React from "react"

import EmptyState from "../../../components/ui/EmptyState"
import ObjetivoCard from "./ObjetivoCard"

export default function ObjetivoList({
  loading,
  missionsByObjetivo,
  objetivos,
  onCreateMission,
  onDelete,
  onEdit,
  onMoveToTop,
  onUpdateStatus,
}) {
  if (objetivos.length === 0) {
    return (
      <EmptyState
        message="Crie um objetivo para organizar ordens relacionadas."
        title="Nenhum objetivo ainda"
      />
    )
  }

  return (
    <div className="grid gap-4">
      {objetivos.map((objetivo, index) => (
        <ObjetivoCard
          key={objetivo.id}
          loading={loading}
          missions={missionsByObjetivo[String(objetivo.id)] || []}
          objetivo={objetivo}
          onCreateMission={() => onCreateMission(objetivo)}
          onDelete={() => onDelete(objetivo)}
          onEdit={() => onEdit(objetivo)}
          onMoveToTop={index > 0 ? () => onMoveToTop(objetivo.id) : null}
          onUpdateStatus={(status) => onUpdateStatus(objetivo.id, status)}
        />
      ))}
    </div>
  )
}
