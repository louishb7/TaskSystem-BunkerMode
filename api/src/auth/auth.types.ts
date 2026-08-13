export type UserRecord = {
  usuario_id: number
  usuario: string
  email: string
  senha_hash: string
  ativo: boolean
  nome_general: string | null
  active_mode: string
  planning_window: string
  timezone: string
  emergency_unlock_date: Date | null
  timezone_updated_at: Date | null
}

export type UserResponse = {
  id: number
  usuario: string
  email: string
  nome_general: string | null
  active_mode: string
  planning_window: string
  timezone: string
  emergency_unlock_date: string | null
  timezone_updated_at: string | null
  ativo?: boolean
}

export type AuthenticatedRequest = {
  currentUser?: UserRecord
}
