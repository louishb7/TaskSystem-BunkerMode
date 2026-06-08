import React, { useMemo, useState } from "react"

import ConfirmDialog from "../../../components/ui/ConfirmDialog.jsx"
import { formatDateForApi } from "../../../utils/date.js"
import MissionForm from "../../missions/components/MissionForm.jsx"
import MountainDialog from "./MountainDialog.jsx"
import ObjetivoForm from "./ObjetivoForm.jsx"

const statusLabels = {
  ativo: "Ativo",
  pausado: "Pausado",
  abandonado: "Abandonado",
  concluido: "Concluído",
}

function formatTargetDate(value) {
  if (!value || typeof value !== "string") {
    return ""
  }
  const [year, month, day] = value.split("-")
  if (!year || !month || !day) {
    return value
  }
  return `${day}/${month}/${year}`
}

function isPastDate(value) {
  if (!value || typeof value !== "string") {
    return false
  }
  const today = new Date()
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) {
    return false
  }
  return new Date(year, month - 1, day).getTime() < current
}

function isRecurringMission(mission) {
  return Array.isArray(mission?.recurrence_weekdays) && mission.recurrence_weekdays.length > 0
}

function recurringMissionKey(mission) {
  if (!isRecurringMission(mission)) {
    return `missao:${mission?.id}`
  }
  return [
    "recorrente",
    mission.objetivo_id || "",
    mission.titulo || "",
    mission.instrucao || "",
    [...mission.recurrence_weekdays].sort().join(","),
    mission.duration_type || "",
    mission.recurrence_end_date || "",
  ].join("|")
}

function missionDateValue(mission) {
  const [day, month, year] = String(mission?.prazo || "")
    .split("-")
    .map(Number)
  if (!day || !month || !year) {
    return Number.MAX_SAFE_INTEGER
  }
  return new Date(year, month - 1, day).getTime()
}

function missionIsCompleted(mission) {
  return mission?.status_code === "CONCLUIDA"
}

function missionStatusLabel(mission, pendingToday = false) {
  if (missionIsCompleted(mission)) {
    return "Cumprida"
  }
  if (pendingToday) {
    return "Pendente"
  }
  return mission?.status_label || mission?.status_code || "Pendente"
}

function summarizeLinkedMissions(missions) {
  const today = formatDateForApi(new Date())
  const groups = new Map()

  missions.forEach((mission) => {
    const key = recurringMissionKey(mission)
    const current = groups.get(key) || []
    current.push(mission)
    groups.set(key, current)
  })

  return Array.from(groups.entries())
    .map(([key, group]) => {
      const todayMission = group.find((mission) => mission.prazo === today)
      const completedToday = todayMission && missionIsCompleted(todayMission)
      const pendingToday = todayMission && !completedToday
      const sorted = [...group].sort((a, b) => missionDateValue(a) - missionDateValue(b))
      const representative =
        todayMission || sorted.find((mission) => !missionIsCompleted(mission)) || sorted[0]

      return {
        key,
        completed: missionIsCompleted(representative),
        pendingToday,
        mission: representative,
        recurring: group.some(isRecurringMission),
      }
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1
      }
      return missionDateValue(a.mission) - missionDateValue(b.mission)
    })
}

export default function ObjetivoCard({
  loading,
  missions = [],
  objetivo,
  onCreateMission,
  onDelete,
  onMoveToTop,
  onUpdate,
  onUpdateStatus,
  sonhos,
}) {
  const [editing, setEditing] = useState(false)
  const [creatingMission, setCreatingMission] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const sonho = useMemo(
    () => sonhos.find((item) => item.id === objetivo.sonho_id),
    [objetivo.sonho_id, sonhos]
  )
  const targetLabel = formatTargetDate(objetivo.data_alvo)
  const concludedLabel = formatTargetDate(objetivo.concluded_at?.slice?.(0, 10))
  const pastTarget = isPastDate(objetivo.data_alvo) && objetivo.status === "ativo"
  const dueLabel = targetLabel ? `Alvo: ${targetLabel}` : "Até conseguir"
  const active = objetivo.status === "ativo"
  const expanded = !active && detailsOpen
  const linkedMissions = useMemo(
    () => summarizeLinkedMissions(Array.isArray(missions) ? missions : []),
    [missions]
  )

  async function submit(payload) {
    const saved = await onUpdate?.(objetivo.id, payload)
    if (saved) {
      setEditing(false)
    }
  }

  async function changeStatus(status) {
    const saved = await onUpdateStatus?.(objetivo.id, status)
    if (saved) {
      setManageOpen(false)
      setDetailsOpen(false)
    }
  }

  async function removeObjetivo() {
    const removed = await onDelete?.(objetivo.id)
    if (removed) {
      setManageOpen(false)
      setDetailsOpen(false)
    }
  }

  async function submitMission(payload) {
    const saved = await onCreateMission?.({
      ...payload,
      objetivo_id: objetivo.id,
    })
    if (saved) {
      setCreatingMission(false)
    }
  }

  function renderManagementActions() {
    return (
      <div className="objective-management">
        <section className="management-block">
          <div>
            <p className="section-kicker fire">DADOS</p>
            <h3>Editar objetivo</h3>
          </div>
          <button
            className="button secondary compact"
            disabled={loading}
            type="button"
            onClick={() => {
              setManageOpen(false)
              setEditing(true)
            }}
          >
            EDITAR TÍTULO E PRAZO
          </button>
        </section>

        <section className="management-block state-actions">
          <div>
            <p className="section-kicker fire">ESTADO</p>
            <h3>{statusLabels[objetivo.status] || objetivo.status}</h3>
          </div>
          <div className="mountain-card-actions compact-state-actions">
            {objetivo.status !== "concluido" && (
              <button
                className="button success compact"
                disabled={loading}
                type="button"
                onClick={() => setConfirmAction("concluir")}
              >
                MARCAR COMO CONCLUÍDO
              </button>
            )}
            {objetivo.status !== "pausado" && objetivo.status !== "concluido" && (
              <button
                className="button secondary compact"
                disabled={loading}
                type="button"
                onClick={() => changeStatus("pausado")}
              >
                PAUSAR
              </button>
            )}
            {objetivo.status !== "ativo" && (
              <button
                className="button secondary compact"
                disabled={loading}
                type="button"
                onClick={() => changeStatus("ativo")}
              >
                REATIVAR
              </button>
            )}
            {objetivo.status !== "abandonado" && objetivo.status !== "concluido" && (
              <button
                className="button secondary compact"
                disabled={loading}
                type="button"
                onClick={() => changeStatus("abandonado")}
              >
                ABANDONAR
              </button>
            )}
            <button
              className="button danger ghost compact"
              disabled={loading}
              type="button"
              onClick={() => setConfirmAction("remover")}
            >
              REMOVER
            </button>
          </div>
        </section>
      </div>
    )
  }

  function renderLinkedMissions(title = "ORDENS VINCULADAS") {
    if (linkedMissions.length === 0) {
      return <p className="muted objetivo-empty-orders">Objetivo sem ordens operacionais.</p>
    }

    return (
      <div className="objective-linked-missions compact">
        <p className="section-kicker fire">{title}</p>
        {linkedMissions.map(({ completed, key, mission, pendingToday, recurring }) => (
          <div
            className={`objective-linked-mission${completed ? " completed-today" : ""}${pendingToday ? " pending-today" : ""}`}
            key={key}
          >
            <strong>{mission.titulo || "Sem título"}</strong>
            <span>
              {recurring && <small>Recorrente</small>}
              {missionStatusLabel(mission, pendingToday)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <article className={`objetivo-card mountain-camp-card status-${objetivo.status}`}>
      <div className="objetivo-card-head">
        <div>
          <h3>{objetivo.titulo}</h3>
          <div className="objetivo-meta compact">
            <span className={pastTarget ? "target-date past" : "target-date"}>{dueLabel}</span>
          </div>
        </div>
        <button
          aria-label="Mover objetivo para o topo"
          className="button secondary compact objective-move-top"
          disabled={loading || !onMoveToTop}
          title="Mover para o topo"
          type="button"
          onClick={onMoveToTop}
        >
          ↑
        </button>
      </div>

      {active && <>{renderLinkedMissions()}</>}

      {!active && !expanded && (
        <>
          {renderLinkedMissions("ORDENS")}
          <div className="objective-card-footer">
            <button
              className="button fire compact objective-primary-action"
              type="button"
              onClick={() => setManageOpen(true)}
            >
              GERENCIAR
            </button>
            <button
              className="button secondary compact"
              type="button"
              onClick={() => setDetailsOpen(true)}
            >
              DETALHES
            </button>
          </div>
        </>
      )}

      {!active && expanded && (
        <>
          {objetivo.descricao && <p>{objetivo.descricao}</p>}

          <div className="objetivo-meta">
            <span>{sonho ? `Sonho: ${sonho.titulo}` : "Sem sonho vinculado"}</span>
            <span className={pastTarget ? "target-date past" : "target-date"}>{dueLabel}</span>
            {objetivo.status === "concluido" && concludedLabel && (
              <span>Conclusão: {concludedLabel}</span>
            )}
          </div>

          {renderLinkedMissions("ORDENS")}

          <div className="objective-card-footer">
            <button
              className="button fire compact objective-primary-action"
              type="button"
              onClick={() => setManageOpen(true)}
            >
              GERENCIAR
            </button>
            <button
              className="button secondary compact"
              type="button"
              onClick={() => setDetailsOpen(false)}
            >
              OCULTAR
            </button>
          </div>
        </>
      )}

      {active && (
        <div className="objective-card-footer">
          <button
            className="button fire compact objective-primary-action"
            type="button"
            onClick={() => setManageOpen(true)}
          >
            GERENCIAR
          </button>
          <button
            className="button secondary compact"
            type="button"
            onClick={() => setCreatingMission(true)}
          >
            NOVA ORDEM
          </button>
          <button
            className="button secondary compact objective-state-action"
            type="button"
            onClick={() => setManageOpen(true)}
          >
            Estado
          </button>
        </div>
      )}

      {manageOpen && (
        <MountainDialog label="Gerenciar objetivo" onClose={() => setManageOpen(false)}>
          <div className="section-heading compact">
            <div>
              <p className="section-kicker fire">GERENCIAR OBJETIVO</p>
              <h2>{objetivo.titulo}</h2>
            </div>
          </div>
          <div className="objetivo-meta">
            <span>{sonho ? `Sonho: ${sonho.titulo}` : "Sem sonho vinculado"}</span>
            <span className={pastTarget ? "target-date past" : "target-date"}>{dueLabel}</span>
          </div>
          {renderManagementActions()}
        </MountainDialog>
      )}

      {creatingMission && (
        <MountainDialog label="Nova ordem" onClose={() => setCreatingMission(false)}>
          <div className="objective-order-context">
            <p className="section-kicker fire">ORDEM DO OBJETIVO</p>
            <h2>{objetivo.titulo}</h2>
            <p className="muted">Esta ordem nasce vinculada a este objetivo estratégico.</p>
          </div>
          <MissionForm
            initialObjetivoId={objetivo.id}
            initialObjetivoTitulo={objetivo.titulo}
            lockObjetivo
            loading={loading}
            onCancel={() => setCreatingMission(false)}
            onCreate={submitMission}
            status={{ type: "", message: "" }}
          />
        </MountainDialog>
      )}

      {editing && (
        <MountainDialog label="Editar objetivo" onClose={() => setEditing(false)}>
          <div className="section-heading compact">
            <div>
              <p className="section-kicker fire">EDITAR OBJETIVO</p>
              <h2>{objetivo.titulo}</h2>
            </div>
          </div>
          <ObjetivoForm
            editingObjetivo={objetivo}
            loading={loading}
            onCancel={() => setEditing(false)}
            onSubmit={submit}
          />
        </MountainDialog>
      )}

      {confirmAction === "concluir" && (
        <ConfirmDialog
          title="Concluir objetivo"
          message={`"${objetivo.titulo}" será marcado como concluído. Isso é uma mudança de estado, não um salvamento de progresso.`}
          confirmLabel="MARCAR COMO CONCLUÍDO"
          variant="success"
          onCancel={() => setConfirmAction(null)}
          onConfirm={async () => {
            setConfirmAction(null)
            await changeStatus("concluido")
          }}
        />
      )}

      {confirmAction === "remover" && (
        <ConfirmDialog
          title="Remover objetivo"
          message={`"${objetivo.titulo}" será removido. As ordens vinculadas perdem o vínculo com este objetivo.`}
          confirmLabel="REMOVER"
          variant="danger"
          onCancel={() => setConfirmAction(null)}
          onConfirm={async () => {
            setConfirmAction(null)
            await removeObjetivo()
          }}
        />
      )}
    </article>
  )
}
