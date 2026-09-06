import React, { useEffect, useLayoutEffect, useRef, useState } from "react"

import Badge from "../../../components/ui/Badge"
import Button from "../../../components/ui/Button"
import { isCompleted } from "../../../utils/missionStatus"
import { operationalDateFor } from "../../calendar/calendarUtils"

function can(mission, key) {
  return Boolean(mission?.permissions?.[key]) && mission?.id !== undefined && mission?.id !== null
}

function parseMissionDate(value) {
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
  const parsed = parseMissionDate(value)
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

function statusText(mission) {
  const compact = {
    CONCLUIDA: "",
    FALHA: "FALHOU",
  }
  const statusCode = String(mission?.status_code || "").toUpperCase()
  const fallbackLabel = String(mission?.status_label || "").trim()

  if (statusCode === "PENDENTE" || fallbackLabel.toUpperCase() === "PENDENTE") {
    return ""
  }

  return compact[statusCode] || fallbackLabel || ""
}

export default function MissionCard({
  completing = false,
  failing = false,
  mission,
  onComplete,
  onDelete = undefined,
  onEdit = undefined,
  onFail,
  onReopen = undefined,
  onTogglePin = undefined,
  pinning = false,
  reopening = false,
  timezone = undefined,
  variant = "general",
}) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [instructionOverflow, setInstructionOverflow] = useState(false)
  const instructionRef = useRef(null)
  const soldier = variant === "soldier"
  const title = mission?.titulo || "Sem título"
  const instruction = mission?.instrucao || ""
  const isPinned = mission?.is_pinned === true
  const disabled = pinning || completing || failing || reopening
  const canComplete = can(mission, "can_complete")
  const canFail = can(mission, "can_fail")
  const canTogglePin = !soldier && can(mission, "can_pin") && typeof onTogglePin === "function"
  const completed = isCompleted(mission)
  const deadlineLabel = formatDeadline(mission?.prazo, timezone)
  const failed = String(mission?.status_code || "") === "FALHA"
  const currentStatusText = statusText(mission)
  const hasBadge = isPinned || currentStatusText

  useEffect(() => {
    setDetailsOpen(false)
  }, [mission?.id, mission?.is_pinned])

  useLayoutEffect(() => {
    if (!soldier || !instruction) {
      setInstructionOverflow(false)
      return undefined
    }

    function measureInstruction() {
      const element = instructionRef.current
      if (!element) {
        setInstructionOverflow(false)
        return
      }
      setInstructionOverflow(element.scrollHeight > element.clientHeight + 1)
    }

    measureInstruction()
    window.addEventListener("resize", measureInstruction)
    return () => window.removeEventListener("resize", measureInstruction)
  }, [instruction, soldier])

  if (soldier) {
    return (
      <article
        className={`mission-card soldier-card ${isPinned ? "priority-high" : ""} ${failed ? "danger" : ""}`}
      >
        <div className="soldier-card-inner">
          <div className="soldier-card-info">
            {hasBadge && (
              <div className="mission-badge-row">
                {isPinned && <span className="meta-tag critical">PRIORIDADE ELEVADA</span>}
                {currentStatusText && <span className="meta-tag">{currentStatusText}</span>}
              </div>
            )}
            <div className="soldier-card-title-row">
              <h3>{title}</h3>
            </div>
            {instruction && (
              <p
                ref={instructionRef}
                className={`mission-instruction ${detailsOpen ? "expanded" : ""}`}
              >
                {instruction}
              </p>
            )}
            {instructionOverflow && (
              <button
                className="soldier-details-toggle"
                type="button"
                onClick={() => setDetailsOpen((current) => !current)}
              >
                {detailsOpen ? "Ocultar detalhes" : "Ver detalhes"}
              </button>
            )}
            {canFail && (
              <button
                className="soldier-failure-trigger"
                disabled={disabled}
                type="button"
                onClick={() => onFail?.(mission.id)}
              >
                {failing ? "Aguarde" : "Falhei."}
              </button>
            )}
          </div>

          {canComplete && (
            <div className="soldier-card-action">
              <button
                className="soldier-abate-btn"
                disabled={completing}
                type="button"
                onClick={onComplete}
              >
                {completing ? "…" : "ABATER"}
              </button>
            </div>
          )}
        </div>
      </article>
    )
  }

  return (
    <article className="grid gap-4 rounded-card border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="m-0 text-base font-semibold normal-case text-text-primary">{title}</h3>
          {instruction && <p className="mt-2 mb-0 text-sm leading-6 text-text-secondary">{instruction}</p>}
        </div>
        {canTogglePin && (
          <Button
            aria-label={isPinned ? "Remover prioridade" : "Elevar prioridade"}
            disabled={disabled}
            size="small"
            variant="ghost"
            onClick={() => onTogglePin(mission)}
          >
            {isPinned ? "Prioridade alta" : "Priorizar"}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {isPinned && <Badge variant="warning">Prioridade alta</Badge>}
        {deadlineLabel && <Badge variant={deadlineLabel === "HOJE" ? "warning" : "neutral"}>{deadlineLabel === "HOJE" ? "Hoje" : deadlineLabel}</Badge>}
        {mission?.recurrence && <Badge>Recorrente</Badge>}
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
          <Button loading={failing} size="small" variant="secondary" onClick={() => onFail?.(mission.id)}>
            Registrar falha
          </Button>
        )}
        {can(mission, "can_edit") && (
          <Button disabled={disabled} size="small" variant="ghost" onClick={onEdit}>
            Editar
          </Button>
        )}
        {can(mission, "can_delete") && (
          <Button disabled={disabled} size="small" variant="danger" onClick={onDelete}>
            Remover
          </Button>
        )}
        {completed && can(mission, "can_edit") && onReopen && (
          <Button loading={reopening} size="small" variant="secondary" onClick={onReopen}>
            Reabrir
          </Button>
        )}
      </div>
    </article>
  )
}

export function MissionProgress({ emptyLabel = "DIA OFF", label = "PROGRESSO", missions }) {
  const total = missions.length
  const completed = missions.filter(isCompleted).length
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0
  const complete = total > 0 && completed === total
  const off = total === 0

  return (
    <div className={`mission-progress ${complete ? "complete" : ""} ${off ? "off" : ""}`}>
      <div>
        <span>{label}</span>
        <strong>{off ? emptyLabel : `${percent}%`}</strong>
      </div>
      <div className="progress-track">
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="progress-meta">
        <span>{off ? emptyLabel : `${completed}/${total} EXECUTADAS`}</span>
      </div>
    </div>
  )
}
