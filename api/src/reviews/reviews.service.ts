import { HttpException, HttpStatus, Injectable } from "@nestjs/common"

import { UserRecord } from "../auth/auth.types"
import { OperationalCalendarService } from "../calendar/operational-calendar.service"
import { dateOnly, ensureGeneral, parseIsoDate } from "../common/domain-helpers"
import { toMissionResponse } from "../missions/mission-response"
import { MissionsService } from "../missions/missions.service"
import { MISSION_STATUS, MissionRecord } from "../missions/mission.types"
import { PrismaService } from "../prisma/prisma.service"
import { toReviewResponse, WeeklyReport } from "./reviews.types"

type DateRange = {
  start_date: string
  end_date: string
}

type CloseReviewPayload = {
  observacao?: unknown
}

function optionalObservation(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value !== "string") {
    throw new HttpException("Observação da revisão deve ser texto.", HttpStatus.BAD_REQUEST)
  }
  const normalized = value.trim()
  return normalized || null
}

function missionEventDate(mission: MissionRecord): Date | null {
  return mission.completed_at ?? mission.failed_at
}

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly missionsService: MissionsService,
    private readonly calendar: OperationalCalendarService,
  ) {}

  async weeklyReport(user: UserRecord, startDate?: unknown, endDate?: unknown): Promise<WeeklyReport> {
    ensureGeneral(user, "Relatório semanal disponível apenas com o modo General ativo.")
    const range = this.resolveRange(user, startDate, endDate, "Datas do relatório devem usar o formato YYYY-MM-DD.")
    const missions = await this.missionsService.listAllForUser(user)
    return this.calculateWeeklyReport(user, missions, range!)
  }

  async reviewState(user: UserRecord) {
    ensureGeneral(user, "Revisão do General disponível apenas com o modo General ativo.")
    const period = this.previousWeek(user)
    const existing = await this.prisma.revisoes_semanais.findFirst({
      where: {
        usuario_id: user.usuario_id,
        start_date: parseIsoDate(period.start_date, "Período da revisão inválido.")!,
        end_date: parseIsoDate(period.end_date, "Período da revisão inválido.")!,
      },
    })
    const reading = await this.reading(user, period)
    const totalOperational = reading.report.total_missions + reading.pending_missions
    return {
      pending: existing === null && totalOperational > 0,
      period,
      review: existing ? toReviewResponse(existing) : null,
      reading,
    }
  }

  async listReviews(user: UserRecord) {
    ensureGeneral(user, "Revisão do General disponível apenas com o modo General ativo.")
    const reviews = await this.prisma.revisoes_semanais.findMany({
      where: { usuario_id: user.usuario_id },
      orderBy: [{ start_date: "desc" }, { revisao_id: "desc" }],
    })
    return reviews.map(toReviewResponse)
  }

  async closeReview(user: UserRecord, payload: CloseReviewPayload) {
    ensureGeneral(user, "Revisão do General disponível apenas com o modo General ativo.")
    const period = this.previousWeek(user)
    const start = parseIsoDate(period.start_date, "Período da revisão inválido.")!
    const end = parseIsoDate(period.end_date, "Período da revisão inválido.")!
    const existing = await this.prisma.revisoes_semanais.findFirst({
      where: { usuario_id: user.usuario_id, start_date: start, end_date: end },
    })
    if (existing) {
      return toReviewResponse(existing)
    }

    const reading = await this.reading(user, period)
    const report = reading.report
    const total = report.total_missions + reading.pending_missions
    const review = await this.prisma.revisoes_semanais.create({
      data: {
        usuario_id: user.usuario_id,
        start_date: start,
        end_date: end,
        reviewed_at: new Date(),
        resumo_operacional: `${report.completed_missions} executadas, ${reading.pending_missions} pendentes, ${report.failed_missions} falhas em ${total} ordens analisadas.`,
        completed_missions: report.completed_missions,
        pending_missions: reading.pending_missions,
        failed_missions: report.failed_missions,
        high_priority_missions: report.high_priority_missions,
        observacao: optionalObservation(payload.observacao),
      },
    })
    return toReviewResponse(review)
  }

  async generalSupport(user: UserRecord) {
    ensureGeneral(user)
    const [reviewMissions, historicalMissions, reviewState, weeklyReviews] = await Promise.all([
      this.missionsService.listForReview(user),
      this.missionsService.listHistorical(user),
      this.reviewState(user),
      this.listReviews(user),
    ])
    return {
      review_missions: reviewMissions.map((mission) => toMissionResponse(mission, user)),
      historical_missions: historicalMissions.map((mission) => toMissionResponse(mission, user)),
      review_state: reviewState,
      weekly_reviews: weeklyReviews,
    }
  }

  private async reading(user: UserRecord, range: DateRange) {
    const missions = await this.missionsService.listAllForUser(user)
    const report = this.calculateWeeklyReport(user, missions, range)
    const pending = missions.filter(
      (mission) => mission.status === MISSION_STATUS.pending && mission.prazo && this.isDateInRange(dateOnly(mission.prazo)!, range),
    )
    const failures = missions.filter((mission) => {
      if (mission.status !== MISSION_STATUS.failed || !mission.failed_at) {
        return false
      }
      return this.isDateInRange(this.calendar.currentDateFor(mission.failed_at, user.timezone), range)
    })
    const history = missions.filter((mission) => {
      const eventDate = missionEventDate(mission)
      const eventInRange = eventDate ? this.isDateInRange(this.calendar.currentDateFor(eventDate, user.timezone), range) : false
      const dueInRange = mission.prazo ? this.isDateInRange(dateOnly(mission.prazo)!, range) : false
      return eventInRange || dueInRange
    })

    return {
      report,
      pending_missions: pending.length,
      failures: failures.map((mission) => toMissionResponse(mission, user)),
      operational_history: history.map((mission) => toMissionResponse(mission, user)),
    }
  }

  private calculateWeeklyReport(user: UserRecord, missions: MissionRecord[], range: DateRange): WeeklyReport {
    const considered = missions.filter((mission) => {
      const eventDate = missionEventDate(mission)
      return eventDate ? this.isDateInRange(this.calendar.currentDateFor(eventDate, user.timezone), range) : false
    })
    const completed = considered.filter((mission) => mission.status === MISSION_STATUS.completed)
    const failed = considered.filter((mission) => mission.status === MISSION_STATUS.failed)
    return {
      start_date: range.start_date,
      end_date: range.end_date,
      total_missions: considered.length,
      completed_missions: completed.length,
      failed_missions: failed.length,
      completion_rate: considered.length === 0 ? 0 : Math.round((completed.length / considered.length) * 10000) / 100,
      high_priority_missions: considered.filter((mission) => mission.is_pinned).length,
    }
  }

  private resolveRange(user: UserRecord, startDate: unknown, endDate: unknown, message: string, allowEmpty = false): DateRange | null {
    if ((startDate === null || startDate === undefined || startDate === "") && (endDate === null || endDate === undefined || endDate === "")) {
      return allowEmpty ? null : this.currentWeek(user)
    }
    const start = parseIsoDate(startDate, message)
    const end = parseIsoDate(endDate, message)
    if (!start || !end) {
      throw new HttpException("Informe start_date e end_date juntos para filtrar o relatório.", HttpStatus.BAD_REQUEST)
    }
    if (end < start) {
      throw new HttpException("Intervalo semanal inválido.", HttpStatus.BAD_REQUEST)
    }
    return {
      start_date: dateOnly(start)!,
      end_date: dateOnly(end)!,
    }
  }

  private currentWeek(user: UserRecord): DateRange {
    return this.calendar.weekBounds(this.calendar.currentDateFor(new Date(), user.timezone))
  }

  private previousWeek(user: UserRecord): DateRange {
    return this.calendar.previousWeekBounds(this.calendar.currentDateFor(new Date(), user.timezone))
  }

  private isDateInRange(value: string, range: DateRange): boolean {
    return value >= range.start_date && value <= range.end_date
  }
}
