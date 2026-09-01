import { MISSION_STATUS, MISSION_STATUS_LABEL, MissionPermissions, MissionRecord, MissionResponse, MissionUser } from "./mission.types"

function dateOnly(value: Date | null): string | null {
  if (!value) {
    return null
  }
  const [year, month, day] = value.toISOString().slice(0, 10).split("-")
  return `${day}-${month}-${year}`
}

function dateTime(value: Date | null): string | null {
  return value ? value.toISOString() : null
}

function isPending(mission: MissionRecord): boolean {
  return mission.status === MISSION_STATUS.pending
}

function isFinalized(mission: MissionRecord): boolean {
  return mission.status === MISSION_STATUS.completed || mission.status === MISSION_STATUS.failed
}

export function missionPermissions(mission: MissionRecord, user: MissionUser): MissionPermissions {
  const isGeneral = user.active_mode === "general"
  const canExecute = isGeneral || user.active_mode === "soldier"
  const pending = isPending(mission)

  return {
    can_complete: canExecute && pending,
    can_edit: isGeneral && pending,
    can_delete: isGeneral && pending,
    can_fail: canExecute && pending,
    can_pin: canExecute && pending,
    can_view_history: isGeneral && isFinalized(mission),
  }
}

export function toMissionResponse(mission: MissionRecord, user: MissionUser): MissionResponse {
  const status = mission.status as keyof typeof MISSION_STATUS_LABEL
  const recurrence = mission.serie_recorrencia
    ? {
        series_id: mission.serie_recorrencia.recurrence_series_id,
        weekdays: mission.serie_recorrencia.recurrence_weekdays,
        termination_policy: mission.serie_recorrencia.termination_policy,
        end_date: dateOnly(mission.serie_recorrencia.end_date),
      }
    : null

  return {
    id: mission.missao_id,
    titulo: mission.titulo,
    prioridade: mission.prioridade,
    prazo: dateOnly(mission.prazo),
    instrucao: mission.instrucao,
    status: mission.status as MissionResponse["status"],
    status_code: mission.status as MissionResponse["status_code"],
    status_label: MISSION_STATUS_LABEL[status] ?? mission.status,
    is_pinned: mission.is_pinned,
    created_at: mission.created_at.toISOString(),
    updated_at: mission.updated_at.toISOString(),
    completed_at: dateTime(mission.completed_at),
    failed_at: dateTime(mission.failed_at),
    user_id: mission.responsavel_id,
    criada_por_id: mission.criada_por_id,
    responsavel_id: mission.responsavel_id,
    objetivo_id: mission.objetivo_id,
    sonho_id: mission.sonho_id,
    recurrence_weekdays: mission.recurrence_weekdays,
    recurrence_end_date: dateOnly(mission.recurrence_end_date),
    duration_type: mission.duration_type,
    recurrence,
    permissions: missionPermissions(mission, user),
  }
}
