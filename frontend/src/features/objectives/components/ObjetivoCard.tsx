import React from "react"

const statusLabels = {
  ativo: "Ativo",
  pausado: "Pausado",
  abandonado: "Abandonado",
  concluido: "Concluído",
}

function formatTargetDate(value) {
  if (!value || typeof value !== "string") {
    return "Até conseguir"
  }
  const [year, month, day] = value.split("-")
  return year && month && day ? `Alvo: ${day}/${month}/${year}` : value
}

export default function ObjetivoCard({
  loading,
  missionCount,
  objetivo,
  onCreateMission,
  onDelete,
  onEdit,
  onMoveToTop,
  onUpdateStatus,
}) {
  return (
    <article className={`objetivo-card status-${objetivo.status}`}>
      <div className="objetivo-card-head">
        <div>
          <h3>{objetivo.titulo}</h3>
          <div className="objetivo-meta compact">
            <span>{formatTargetDate(objetivo.data_alvo)}</span>
            <span>{statusLabels[objetivo.status] || objetivo.status}</span>
            <span>{missionCount} ordens em aberto</span>
          </div>
        </div>
        {onMoveToTop && (
          <button
            aria-label="Mover objetivo para o início"
            className="button secondary compact objective-move-top"
            disabled={loading}
            title="Mover para o início"
            type="button"
            onClick={onMoveToTop}
          >
            ↑
          </button>
        )}
      </div>

      {objetivo.descricao && <p>{objetivo.descricao}</p>}

      <div className="objective-card-footer">
        <button className="button fire compact" disabled={loading} type="button" onClick={onCreateMission}>
          NOVA ORDEM
        </button>
        <button className="button secondary compact" disabled={loading} type="button" onClick={onEdit}>
          EDITAR
        </button>
        <label className="sr-only" htmlFor={`objetivo-status-${objetivo.id}`}>
          Status do objetivo
        </label>
        <select
          id={`objetivo-status-${objetivo.id}`}
          disabled={loading}
          value={objetivo.status}
          onChange={(event) => onUpdateStatus(event.target.value)}
        >
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button className="button danger ghost compact" disabled={loading} type="button" onClick={onDelete}>
          REMOVER
        </button>
      </div>
    </article>
  )
}
