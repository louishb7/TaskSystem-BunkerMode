import { sonhos } from "@prisma/client"

import { dateTime } from "../common/domain-helpers"

export const DREAM_TYPE = {
  principal: "principal",
  secondary: "secundario",
} as const

export const DREAM_STATUS = {
  active: "ativo",
  archived: "arquivado",
  concluded: "concluido",
} as const

export type DreamResponse = {
  id: number
  usuario_id: number
  titulo: string
  descricao: string | null
  tipo: string
  status: string
  justificativa_arquivamento: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
  concluded_at: string | null
}

export function toDreamResponse(dream: sonhos): DreamResponse {
  return {
    id: dream.id,
    usuario_id: dream.usuario_id,
    titulo: dream.titulo,
    descricao: dream.descricao,
    tipo: dream.tipo,
    status: dream.status,
    justificativa_arquivamento: dream.justificativa_arquivamento,
    created_at: dream.created_at.toISOString(),
    updated_at: dream.updated_at.toISOString(),
    archived_at: dateTime(dream.archived_at),
    concluded_at: dateTime(dream.concluded_at),
  }
}
