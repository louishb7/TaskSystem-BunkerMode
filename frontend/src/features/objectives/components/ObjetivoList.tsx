import React from "react"

import ObjetivoCard from "./ObjetivoCard"

export default function ObjetivoList({
  loading,
  missionCounts,
  objetivos,
  onCreateMission,
  onDelete,
  onEdit,
  onMoveToTop,
  onUpdateStatus,
}) {
  if (objetivos.length === 0) {
    return <p className="muted">Nenhum objetivo registrado.</p>
  }

  return (
    <div className="objetivo-list">
      {objetivos.map((objetivo, index) => (
        <ObjetivoCard
          key={objetivo.id}
          loading={loading}
          missionCount={missionCounts[String(objetivo.id)] || 0}
          objetivo={objetivo}
          onCreateMission={() => onCreateMission(objetivo)}
          onDelete={() => onDelete(objetivo)}
          onEdit={() => onEdit(objetivo)}
          onMoveToTop={
            objetivos.slice(0, index).some((item) => item.sonho_id === objetivo.sonho_id)
              ? () => onMoveToTop(objetivo.id)
              : null
          }
          onUpdateStatus={(status) => onUpdateStatus(objetivo.id, status)}
        />
      ))}
    </div>
  )
}
