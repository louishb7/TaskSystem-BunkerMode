import { UserRecord } from "../auth/auth.types"

export const MISSION_STATUS = {
  pending: "Pendente",
  completed: "Concluída",
  failed: "Falha",
} as const

export const MISSION_STATUS_CODE = {
  [MISSION_STATUS.pending]: "PENDENTE",
  [MISSION_STATUS.completed]: "CONCLUIDA",
  [MISSION_STATUS.failed]: "FALHA",
} as const

export const MISSION_INSTRUCTION_MAX_LENGTH = 280
export const LEGACY_DEFAULT_PRIORITY = 2

export type MissionRecord = {
  missao_id: number
  titulo: string
  prioridade: number
  prazo: Date | null
  instrucao: string | null
  status: string
  is_pinned: boolean
  created_at: Date
  completed_at: Date | null
  failed_at: Date | null
  failure_reason_type: string | null
  failure_reason: string | null
  soldier_excuse: string | null
  general_verdict: string | null
  recurrence_weekdays: string | null
  recurrence_end_date: Date | null
  duration_type: string | null
  objetivo_id: number | null
  sonho_id: number | null
  missao_contextos?: {
    responsavel_id: number | null
  } | null
}

export type MissionUser = Pick<UserRecord, "usuario_id" | "active_mode">

export type MissionPermissions = {
  can_complete: boolean
  can_edit: boolean
  can_delete: boolean
  can_justify: boolean
  can_fail: boolean
  can_pin: boolean
  can_review: boolean
  can_view_history: boolean
}

export type MissionResponse = {
  id: number
  titulo: string
  prioridade: number
  prazo: string | null
  due_date: string | null
  instrucao: string | null
  status: string
  status_code: string
  status_label: string
  is_pinned: boolean
  created_at: string
  completed_at: string | null
  failed_at: string | null
  failure_reason_type: string | null
  failure_reason: string | null
  soldier_excuse: string | null
  general_verdict: string | null
  user_id: number | null
  objetivo_id: number | null
  sonho_id: number | null
  recurrence_weekdays: number[] | null
  recurrence_end_date: string | null
  duration_type: string | null
  requires_immediate_justification: false
  has_pending_non_blocking_justification: false
  permissions: MissionPermissions
  is_previous_operational_pending: false
}
