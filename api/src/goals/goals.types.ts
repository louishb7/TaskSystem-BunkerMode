import { objetivos } from "@prisma/client"

import { dateOnly, dateTime } from "../common/domain-helpers"

export const GOAL_STATUS = {
  active: "ativo",
  concluded: "concluido",
  paused: "pausado",
  abandoned: "abandonado",
} as const

export type GoalResponse = {
  id: number
  usuario_id: number
  sonho_id: number | null
  titulo: string
  descricao: string | null
  data_alvo: string | null
  progresso: number
  status: string
  order_index: number
  created_at: string
  updated_at: string
  concluded_at: string | null
}

export function toGoalResponse(goal: objetivos): GoalResponse {
  return {
    id: goal.id,
    usuario_id: goal.usuario_id,
    sonho_id: goal.sonho_id,
    titulo: goal.titulo,
    descricao: goal.descricao,
    data_alvo: dateOnly(goal.data_alvo),
    progresso: goal.progresso,
    status: goal.status,
    order_index: goal.order_index,
    created_at: goal.created_at.toISOString(),
    updated_at: goal.updated_at.toISOString(),
    concluded_at: dateTime(goal.concluded_at),
  }
}
