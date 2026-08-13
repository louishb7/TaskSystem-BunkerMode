import { UserRecord, UserResponse } from "./auth.types"

function dateOnly(value: Date | null): string | null {
  if (!value) {
    return null
  }
  return value.toISOString().slice(0, 10)
}

function dateTime(value: Date | null): string | null {
  if (!value) {
    return null
  }
  return value.toISOString()
}

export function toUserResponse(user: UserRecord, includeAtivo = true): UserResponse {
  const response: UserResponse = {
    id: user.usuario_id,
    usuario: user.usuario,
    email: user.email,
    nome_general: user.nome_general,
    active_mode: user.active_mode,
    planning_window: user.planning_window,
    timezone: user.timezone,
    emergency_unlock_date: dateOnly(user.emergency_unlock_date),
    timezone_updated_at: dateTime(user.timezone_updated_at),
  }

  if (includeAtivo) {
    response.ativo = user.ativo
  }

  return response
}
