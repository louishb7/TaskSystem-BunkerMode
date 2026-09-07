import React from "react"

import Badge from "../../../components/ui/Badge"
import Button from "../../../components/ui/Button"
import { normalizeMissionDate } from "../../calendar/calendarUtils"

const statusLabels = {
  ativo: "Ativo",
  pausado: "Pausado",
  abandonado: "Abandonado",
  concluido: "Concluído",
}

const statusVariants = {
  ativo: "neutral",
  pausado: "warning",
  abandonado: "danger",
  concluido: "success",
}

const missionStatus = {
  PENDENTE: { label: "Em aberto", variant: "neutral" },
  CONCLUIDA: { label: "Concluída", variant: "success" },
  FALHA: { label: "Falha registrada", variant: "danger" },
}

function formatDateOnly(value, fallback) {
  const normalized = normalizeMissionDate(value)
  if (!/^\d{2}-\d{2}-\d{4}$/.test(normalized)) {
    return fallback
  }

  const [day, month, year] = normalized.split("-")
  return `${day}/${month}/${year}`
}

function getMissionStatus(mission) {
  const statusCode = String(mission?.status_code || "").toUpperCase()
  return (
    missionStatus[statusCode] || {
      label: mission?.status_label || "Sem status",
      variant: "neutral",
    }
  )
}

export default function ObjetivoCard({
  loading,
  missions,
  objetivo,
  onCreateMission,
  onDelete,
  onEdit,
  onMoveToTop,
  onUpdateStatus,
}) {
  const targetDate = formatDateOnly(objetivo.data_alvo, "Sem prazo")
  const statusLabel = statusLabels[objetivo.status] || objetivo.status

  return (
    <article className="grid gap-5 rounded-card border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="m-0 break-words text-lg font-semibold text-text-primary">
            {objetivo.titulo}
          </h2>
          {objetivo.descricao && (
            <p className="mt-2 mb-0 break-words text-sm leading-6 text-text-secondary">
              {objetivo.descricao}
            </p>
          )}
        </div>
        <Badge variant={statusVariants[objetivo.status] || "neutral"}>{statusLabel}</Badge>
      </div>

      <p className="m-0 text-sm text-text-secondary">
        <span className="font-medium text-text-primary">Prazo: </span>
        {targetDate}
      </p>

      <section
        className="grid gap-3 border-t border-border pt-4"
        aria-labelledby={`objetivo-orders-${objetivo.id}`}
      >
        <h3
          id={`objetivo-orders-${objetivo.id}`}
          className="m-0 text-sm font-semibold text-text-primary"
        >
          Tarefas vinculadas
        </h3>
        {missions.length > 0 ? (
          <ul className="m-0 grid list-none divide-y divide-border border-y border-border p-0">
            {missions.map((mission) => {
              const status = getMissionStatus(mission)
              return (
                <li
                  className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-3"
                  key={mission.id}
                >
                  <span className="min-w-0 break-words text-sm font-medium text-text-primary">
                    {mission.titulo || "Tarefa sem título"}
                  </span>
                  <span className="text-sm text-text-secondary">
                    {formatDateOnly(mission.prazo, "Sem data")}
                  </span>
                  <Badge className="w-fit" variant={status.variant}>
                    {status.label}
                  </Badge>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="m-0 text-sm text-text-secondary">Nenhuma tarefa vinculada.</p>
        )}
      </section>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button disabled={loading} onClick={onCreateMission}>
          Nova tarefa vinculada
        </Button>
        <Button disabled={loading} size="small" variant="ghost" onClick={onEdit}>
          Editar
        </Button>
        <label
          className="grid gap-1 text-xs font-medium text-text-secondary"
          htmlFor={`objetivo-status-${objetivo.id}`}
        >
          Status
          <select
            className="min-h-11 rounded-control border border-control-border bg-surface px-2 text-sm text-text-primary focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-app disabled:text-text-secondary disabled:opacity-70"
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
        {onMoveToTop && (
          <Button disabled={loading} size="small" variant="ghost" onClick={onMoveToTop}>
            Mover para o início
          </Button>
        )}
        <Button disabled={loading} size="small" variant="danger" onClick={onDelete}>
          Remover
        </Button>
      </div>
    </article>
  )
}
