const REQUIRED_PERMISSION_KEYS = Object.freeze([
  "can_complete",
  "can_edit",
  "can_delete",
  "can_fail",
  "can_pin",
  "can_view_history",
] as const)

export type MissionPermissionKey = (typeof REQUIRED_PERMISSION_KEYS)[number]

export type MissionPermissions = Record<MissionPermissionKey, boolean>

export type MissionRecurrence = {
  series_id: number
  weekdays: number[]
  termination_policy: "sem_termino" | "ate_data" | "ate_objetivo"
  end_date: string | null
}

export type Mission = {
  id: number
  titulo?: string | null
  instrucao?: string | null
  prioridade?: string | null
  prazo?: string | null
  status: string
  status_code: string
  status_label: string
  is_pinned?: boolean
  completed_at?: string | null
  failed_at?: string | null
  responsavel_id?: number | null
  criada_por_id?: number | null
  objetivo_id?: number | null
  recurrence?: MissionRecurrence | null
  permissions: MissionPermissions
}

function buildContractError(message: string): Error {
  return new Error(`Contrato inválido: ${message}`)
}

export function assertMissionContract(mission: unknown): Mission {
  if (!mission || typeof mission !== "object") {
    throw buildContractError("missão ausente ou inválida")
  }

  const candidate = mission as Partial<Mission>

  if (!candidate.status_code) {
    throw buildContractError("missão sem status_code")
  }

  if (!candidate.status_label) {
    throw buildContractError("missão sem status_label")
  }

  if (!candidate.permissions || typeof candidate.permissions !== "object") {
    throw buildContractError("missão sem permissions")
  }

  for (const key of REQUIRED_PERMISSION_KEYS) {
    if (typeof candidate.permissions[key] !== "boolean") {
      throw buildContractError(`permissions.${key} ausente ou não booleano`)
    }
  }

  if (candidate.recurrence !== null && candidate.recurrence !== undefined) {
    const recurrence = candidate.recurrence
    const validPolicy = ["sem_termino", "ate_data", "ate_objetivo"].includes(
      recurrence.termination_policy
    )
    if (
      !Number.isInteger(recurrence.series_id) ||
      recurrence.series_id < 1 ||
      !Array.isArray(recurrence.weekdays) ||
      recurrence.weekdays.some(
        (weekday) => !Number.isInteger(weekday) || weekday < 0 || weekday > 6
      ) ||
      !validPolicy ||
      (recurrence.end_date !== null && typeof recurrence.end_date !== "string")
    ) {
      throw buildContractError("recurrence inválida")
    }
  }

  return candidate as Mission
}

export function assertMissionListContract(missions: unknown): Mission[] {
  if (!Array.isArray(missions)) {
    throw buildContractError("lista de missões inválida")
  }

  return missions.map(assertMissionContract)
}
