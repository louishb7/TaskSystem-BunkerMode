import { MISSION_STATUS, MISSION_STATUS_CODE, MissionPermissions, MissionRecord, MissionResponse, MissionUser } from "./mission.types"

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

function recurrenceWeekdays(value: string | null): number[] | null {
  if (!value) {
    return null
  }
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) && parsed.every((item) => Number.isInteger(item)) ? parsed : null
  } catch {
    return null
  }
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
  const finalized = isFinalized(mission)

  return {
    can_complete: canExecute && pending,
    can_edit: isGeneral && (pending || finalized),
    can_delete: isGeneral && (pending || mission.status === MISSION_STATUS.failed),
    can_justify: false,
    can_fail: canExecute && pending,
    can_pin: canExecute && pending,
    can_review: false,
    can_view_history: isGeneral && finalized,
  }
}

export function toMissionResponse(mission: MissionRecord, user: MissionUser): MissionResponse {
  const prazo = dateOnly(mission.prazo)
  const statusCode = MISSION_STATUS_CODE[mission.status as keyof typeof MISSION_STATUS_CODE] ?? mission.status

  return {
    id: mission.missao_id,
    titulo: mission.titulo,
    prioridade: mission.prioridade,
    prazo,
    due_date: prazo,
    instrucao: mission.instrucao,
    status: mission.status,
    status_code: statusCode,
    status_label: mission.status,
    is_pinned: mission.is_pinned,
    created_at: mission.created_at.toISOString(),
    completed_at: dateTime(mission.completed_at),
    failed_at: dateTime(mission.failed_at),
    failure_reason_type: mission.failure_reason_type,
    failure_reason: mission.failure_reason,
    soldier_excuse: mission.failure_reason,
    general_verdict: mission.general_verdict,
    user_id: mission.missao_contextos?.responsavel_id ?? null,
    objetivo_id: mission.objetivo_id,
    sonho_id: mission.sonho_id,
    recurrence_weekdays: recurrenceWeekdays(mission.recurrence_weekdays),
    recurrence_end_date: dateOnly(mission.recurrence_end_date),
    duration_type: mission.duration_type,
    requires_immediate_justification: false,
    has_pending_non_blocking_justification: false,
    permissions: missionPermissions(mission, user),
    is_previous_operational_pending: false,
  }
}
