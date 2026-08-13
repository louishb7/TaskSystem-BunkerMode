import { revisoes_semanais } from "@prisma/client"

import { dateOnly, dateTime } from "../common/domain-helpers"

export type WeeklyReport = {
  start_date: string
  end_date: string
  total_missions: number
  completed_missions: number
  failed_missions: number
  completion_rate: number
  high_priority_missions: number
}

export type ReviewResponse = {
  id: number
  usuario_id: number
  start_date: string
  end_date: string
  reviewed_at: string
  resumo_operacional: string
  completed_missions: number
  pending_missions: number
  failed_missions: number
  high_priority_missions: number
  observacao: string | null
}

export function toReviewResponse(review: revisoes_semanais): ReviewResponse {
  return {
    id: review.revisao_id,
    usuario_id: review.usuario_id,
    start_date: dateOnly(review.start_date)!,
    end_date: dateOnly(review.end_date)!,
    reviewed_at: dateTime(review.reviewed_at)!,
    resumo_operacional: review.resumo_operacional,
    completed_missions: review.completed_missions,
    pending_missions: review.pending_missions,
    failed_missions: review.failed_missions,
    high_priority_missions: review.high_priority_missions,
    observacao: review.observacao,
  }
}
