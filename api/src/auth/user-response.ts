import { UserRecord, UserResponse } from "./auth.types"

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
    timezone: user.timezone,
    created_at: dateTime(user.created_at)!,
    updated_at: dateTime(user.updated_at)!,
  }

  if (includeAtivo) {
    response.ativo = user.ativo
  }

  return response
}
