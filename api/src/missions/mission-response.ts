import {
  MISSION_STATUS,
  MISSION_STATUS_LABEL,
  MissionPermissions,
  MissionRecord,
  MissionResponse,
  MissionUser,
} from "./mission.types";

function dateOnly(value: Date | null): string | null {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.toISOString().slice(0, 10).split("-");
  return `${day}-${month}-${year}`;
}

function dateTime(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function isPending(mission: MissionRecord): boolean {
  return mission.status === MISSION_STATUS.pending;
}

function isFinalized(mission: MissionRecord): boolean {
  return (
    mission.status === MISSION_STATUS.completed ||
    mission.status === MISSION_STATUS.failed
  );
}

export function missionPermissions(
  mission: MissionRecord,
  user: MissionUser,
): MissionPermissions {
  const owned = mission.responsavel_id === user.usuario_id;
  const pending = isPending(mission);

  return {
    can_complete: owned && pending,
    can_edit: owned && pending,
    can_delete: owned && pending,
    can_fail: owned && pending,
    can_pin: owned && pending,
    can_view_history: owned && isFinalized(mission),
  };
}

export function toMissionResponse(
  mission: MissionRecord,
  user: MissionUser,
): MissionResponse {
  const status = mission.status as keyof typeof MISSION_STATUS_LABEL;
  const recurrence = mission.serie_recorrencia
    ? {
        series_id: mission.serie_recorrencia.recurrence_series_id,
        weekdays: mission.serie_recorrencia.recurrence_weekdays,
        termination_policy: mission.serie_recorrencia.termination_policy,
        end_date: dateOnly(mission.serie_recorrencia.end_date),
      }
    : null;

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
    recurrence,
    permissions: missionPermissions(mission, user),
  };
}
