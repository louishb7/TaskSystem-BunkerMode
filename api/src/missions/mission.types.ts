import { UserRecord } from "../auth/auth.types"

export const MISSION_STATUS = {
  pending: "PENDENTE",
  completed: "CONCLUIDA",
  failed: "FALHA",
} as const

export const MISSION_STATUS_LABEL = {
  [MISSION_STATUS.pending]: "Pendente",
  [MISSION_STATUS.completed]: "Concluída",
  [MISSION_STATUS.failed]: "Falha",
} as const

export const MISSION_INSTRUCTION_MAX_LENGTH = 280
export const DEFAULT_PRIORITY = 2

export type MissionStatus = (typeof MISSION_STATUS)[keyof typeof MISSION_STATUS]

export type MissionRecord = {
  missao_id: number
  titulo: string
  prioridade: number
  prazo: Date | null
  instrucao: string | null
  status: string
  is_pinned: boolean
  created_at: Date
  updated_at: Date
  completed_at: Date | null
  failed_at: Date | null
  recurrence_weekdays: number[]
  recurrence_end_date: Date | null
  duration_type: string | null
  recurrence_key: string | null
  criada_por_id: number
  responsavel_id: number
  objetivo_id: number | null
  sonho_id: number | null
}

export type MissionUser = Pick<UserRecord, "usuario_id" | "active_mode">

export type MissionPermissions = {
  can_complete: boolean
  can_edit: boolean
  can_delete: boolean
  can_fail: boolean
  can_pin: boolean
  can_view_history: boolean
}

export type MissionResponse = {
  id: number
  titulo: string
  prioridade: number
  prazo: string | null
  instrucao: string | null
  status: MissionStatus
  status_code: MissionStatus
  status_label: string
  is_pinned: boolean
  created_at: string
  updated_at: string
  completed_at: string | null
  failed_at: string | null
  user_id: number
  criada_por_id: number
  responsavel_id: number
  objetivo_id: number | null
  sonho_id: number | null
  recurrence_weekdays: number[]
  recurrence_end_date: string | null
  duration_type: string | null
  permissions: MissionPermissions
}
