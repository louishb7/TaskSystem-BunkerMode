import { HttpException, HttpStatus, Injectable } from "@nestjs/common"

import { UserRecord } from "../auth/auth.types"
import { OperationalCalendarService } from "../calendar/operational-calendar.service"
import { PrismaService } from "../prisma/prisma.service"
import {
  LEGACY_DEFAULT_PRIORITY,
  MISSION_INSTRUCTION_MAX_LENGTH,
  MISSION_STATUS,
  MissionRecord,
} from "./mission.types"

type CreateMissionPayload = {
  titulo?: unknown
  prioridade?: unknown
  prazo?: unknown
  instrucao?: unknown
  responsavel_id?: unknown
  objetivo_id?: unknown
  sonho_id?: unknown
  recurrence_weekdays?: unknown
  recurrence_end_date?: unknown
  duration_type?: unknown
}

type UpdateMissionPayload = Partial<CreateMissionPayload> & {
  status?: unknown
}

type MissionContextRecord = {
  missao_id: number
  criada_por_id?: number | null
  responsavel_id: number | null
}

type OperationalTurn = {
  active_date: string
  active_date_label: string
  previous_operational_date: string
  current_calendar_date: string
  before_cutoff: false
  current_day_available: true
  requires_decision: boolean
  auto_advanced: boolean
  previous_pending_count: number
  current_missions_count: number
}

const RECURRENCE_WINDOW_DAYS = 14

function ensureGeneral(user: UserRecord): void {
  if (user.active_mode !== "general") {
    throw new HttpException("Planejamento indisponível enquanto o modo Soldado estiver ativo.", HttpStatus.FORBIDDEN)
  }
}

function ensureExecutionMode(user: UserRecord): void {
  if (user.active_mode !== "general" && user.active_mode !== "soldier") {
    throw new HttpException("Execução disponível apenas em contexto operacional válido.", HttpStatus.FORBIDDEN)
  }
}

function ensureSoldier(user: UserRecord): void {
  if (user.active_mode !== "soldier") {
    throw new HttpException("Conclusão de missão disponível apenas com o modo Soldado ativo.", HttpStatus.FORBIDDEN)
  }
}

function text(value: unknown, message: string): string {
  if (typeof value !== "string") {
    throw new HttpException(message, HttpStatus.BAD_REQUEST)
  }
  const normalized = value.trim()
  if (!normalized) {
    throw new HttpException(message, HttpStatus.BAD_REQUEST)
  }
  return normalized
}

function optionalText(value: unknown, maxLength?: number): string | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value !== "string") {
    throw new HttpException("Campo textual inválido.", HttpStatus.BAD_REQUEST)
  }
  const normalized = value.trim()
  if (!normalized) {
    return null
  }
  if (maxLength !== undefined && normalized.length > maxLength) {
    throw new HttpException("Instrução excede o limite operacional.", HttpStatus.BAD_REQUEST)
  }
  return normalized
}

function optionalId(value: unknown, message: string): number | null {
  if (value === null || value === undefined || value === "") {
    return null
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new HttpException(message, HttpStatus.BAD_REQUEST)
  }
  return value
}

function priority(value: unknown): number {
  if (value === null || value === undefined) {
    return LEGACY_DEFAULT_PRIORITY
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 3) {
    throw new HttpException("Prioridade inválida.", HttpStatus.BAD_REQUEST)
  }
  return value
}

function dateFromPayload(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") {
    return null
  }
  if (typeof value !== "string") {
    throw new HttpException("Prazo inválido.", HttpStatus.BAD_REQUEST)
  }
  const normalized = value.trim()
  const parts = normalized.includes("-") ? normalized.split("-") : []
  const isoParts = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ? parts.map(Number)
    : /^\d{2}-\d{2}-\d{4}$/.test(normalized)
      ? [Number(parts[2]), Number(parts[1]), Number(parts[0])]
      : null
  if (!isoParts) {
    throw new HttpException("Prazo inválido.", HttpStatus.BAD_REQUEST)
  }
  const [year, month, day] = isoParts
  const date = new Date(Date.UTC(year, month - 1, day))
  if (Number.isNaN(date.getTime())) {
    throw new HttpException("Prazo inválido.", HttpStatus.BAD_REQUEST)
  }
  return date
}

function isoDateFromDate(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null
}

function startOfIsoDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function statusFromPayload(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== "string") {
    throw new HttpException("Status inválido.", HttpStatus.BAD_REQUEST)
  }
  const normalized = value.trim().toUpperCase()
  if (normalized === "PENDENTE" || value.trim() === MISSION_STATUS.pending) {
    return MISSION_STATUS.pending
  }
  throw new HttpException("Transições de execução devem usar concluir, falhar ou revisar.", HttpStatus.BAD_REQUEST)
}

function recurrenceWeekdays(value: unknown): number[] | null {
  if (value === null || value === undefined) {
    return null
  }
  if (Array.isArray(value) && value.length === 0) {
    return null
  }
  if (!Array.isArray(value)) {
    throw new HttpException("Frequência semanal da missão deve ser uma lista.", HttpStatus.BAD_REQUEST)
  }
  const normalized: number[] = []
  for (const weekday of value) {
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      throw new HttpException("Dias da frequência semanal devem estar entre 0 e 6.", HttpStatus.BAD_REQUEST)
    }
    if (!normalized.includes(weekday)) {
      normalized.push(weekday)
    }
  }
  return normalized.length > 0 ? normalized : null
}

function durationType(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null
  }
  if (typeof value !== "string") {
    throw new HttpException("Duração da missão vinculada é inválida.", HttpStatus.BAD_REQUEST)
  }
  const normalized = value.trim().toLowerCase()
  if (normalized === "pontual" || normalized === "ate_objetivo" || normalized === "prazo") {
    return normalized
  }
  throw new HttpException("Duração da missão vinculada é inválida.", HttpStatus.BAD_REQUEST)
}

function serializeWeekdays(value: number[] | null): string | null {
  return value ? JSON.stringify(value) : null
}

function addDays(value: Date, amount: number): Date {
  const next = new Date(value)
  next.setUTCDate(next.getUTCDate() + amount)
  return next
}

function weekdayFor(value: Date): number {
  return (value.getUTCDay() + 6) % 7
}

function datesForRecurrence(start: Date, end: Date, weekdays: number[]): Date[] {
  const dates: Date[] = []
  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
    if (weekdays.includes(weekdayFor(cursor))) {
      dates.push(new Date(cursor))
    }
  }
  return dates
}

@Injectable()
export class MissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calendar: OperationalCalendarService,
  ) {}

  async listForGeneralBoard(user: UserRecord): Promise<MissionRecord[]> {
    const { contexts, contextByMissionId } = await this.contextsForUser(user)
    const missions = await this.prisma.missoes.findMany({
      where: {
        missao_id: { in: contexts.map((context) => context.missao_id) },
        status: MISSION_STATUS.pending,
      },
      orderBy: [{ is_pinned: "desc" }, { prazo: "asc" }, { missao_id: "asc" }],
    })
    return missions.map((mission) => ({
      ...mission,
      missao_contextos: contextByMissionId.get(mission.missao_id) ?? null,
    })) as MissionRecord[]
  }

  async listAllForUser(user: UserRecord, options: { materializeRecurrences?: boolean } = {}): Promise<MissionRecord[]> {
    const { contexts, contextByMissionId } = await this.contextsForUser(user)
    if (contexts.length === 0) {
      return []
    }
    let missions = await this.prisma.missoes.findMany({
      where: { missao_id: { in: contexts.map((context) => context.missao_id) } },
      orderBy: [
        { is_pinned: "desc" },
        { status: "asc" },
        { prazo: "asc" },
        { missao_id: "asc" },
      ],
    })
    if (options.materializeRecurrences !== false && (await this.materializeRecurrences(user, missions as MissionRecord[], contexts as MissionContextRecord[]))) {
      const updated = await this.contextsForUser(user)
      missions = await this.prisma.missoes.findMany({
        where: { missao_id: { in: updated.contexts.map((context) => context.missao_id) } },
        orderBy: [{ is_pinned: "desc" }, { status: "asc" }, { prazo: "asc" }, { missao_id: "asc" }],
      })
      return missions.map((mission) => ({
        ...mission,
        missao_contextos: updated.contextByMissionId.get(mission.missao_id) ?? null,
      })) as MissionRecord[]
    }
    return missions.map((mission) => ({
      ...mission,
      missao_contextos: contextByMissionId.get(mission.missao_id) ?? null,
    })) as MissionRecord[]
  }

  async listHistorical(user: UserRecord): Promise<MissionRecord[]> {
    ensureGeneral(user)
    const missions = await this.listAllForUser(user, { materializeRecurrences: false })
    return missions.filter((mission) => mission.status === MISSION_STATUS.completed || mission.status === MISSION_STATUS.failed)
  }

  async listForReview(user: UserRecord): Promise<MissionRecord[]> {
    ensureGeneral(user)
    return []
  }

  async create(payload: CreateMissionPayload, user: UserRecord): Promise<MissionRecord> {
    ensureGeneral(user)

    const weekdays = recurrenceWeekdays(payload.recurrence_weekdays)
    const duration = durationType(payload.duration_type)
    const recurrenceEndDate = dateFromPayload(payload.recurrence_end_date)

    const objetivoId = optionalId(payload.objetivo_id, "Objetivo vinculado não encontrado.")
    const sonhoId = optionalId(payload.sonho_id, "Sonho vinculado não encontrado.")
    if (objetivoId !== null && sonhoId !== null) {
      throw new HttpException("A ordem deve estar vinculada ao sonho ou ao objetivo, não aos dois.", HttpStatus.BAD_REQUEST)
    }

    const responsavelId = optionalId(payload.responsavel_id, "Responsável inválido.") ?? user.usuario_id
    if (responsavelId !== user.usuario_id) {
      throw new HttpException("Responsável inválido.", HttpStatus.BAD_REQUEST)
    }

    await this.ensureStrategicLinks(user, objetivoId, sonhoId)
    const isStrategic = objetivoId !== null || sonhoId !== null
    const isRecurring = isStrategic && weekdays !== null && (duration === "ate_objetivo" || duration === "prazo")
    if (duration === "prazo" && isRecurring && recurrenceEndDate === null) {
      throw new HttpException("Informe a data final da recorrência.", HttpStatus.BAD_REQUEST)
    }
    const existingKeys = new Set(
      (await this.listAllForUser(user, { materializeRecurrences: false })).map((mission) => this.recurrenceKey(mission)),
    )

    const created = await this.prisma.$transaction(async (tx) => {
      const title = text(payload.titulo, "Título da missão é obrigatório.")
      const instruction = optionalText(payload.instrucao, MISSION_INSTRUCTION_MAX_LENGTH)
      const dueDate = dateFromPayload(payload.prazo) ?? startOfIsoDate(this.today(user))
      const dates = isRecurring ? this.recurrenceDates(dueDate, recurrenceEndDate, weekdays!) : [dueDate]
      if (dates.length === 0) {
        throw new HttpException("A frequência semanal não gera ordens dentro da janela permitida.", HttpStatus.BAD_REQUEST)
      }

      let firstMission: MissionRecord | null = null
      for (const date of dates) {
        const key = this.recurrenceKey({
          titulo: title,
          instrucao: instruction,
          prazo: date,
          objetivo_id: objetivoId,
          sonho_id: sonhoId,
        })
        if (existingKeys.has(key)) {
          continue
        }

        const mission = await tx.missoes.create({
          data: {
            titulo: title,
            prioridade: priority(payload.prioridade),
            prazo: date,
            instrucao: instruction,
            status: MISSION_STATUS.pending,
            objetivo_id: objetivoId,
            sonho_id: sonhoId,
            recurrence_weekdays: isRecurring ? serializeWeekdays(weekdays) : null,
            recurrence_end_date: isRecurring ? recurrenceEndDate : null,
            duration_type: isStrategic ? duration : null,
          },
        })

        await tx.missao_contextos.create({
          data: {
            missao_id: mission.missao_id,
            criada_por_id: user.usuario_id,
            responsavel_id: responsavelId,
          },
        })

        await tx.auditoria_eventos.create({
          data: {
            missao_id: mission.missao_id,
            usuario_id: user.usuario_id,
            acao: isRecurring ? "missao_recorrente_criada" : "missao_criada",
            detalhes: isRecurring ? `Recorrência gerou a ordem '${mission.titulo}'.` : `Missão '${mission.titulo}' criada.`,
          },
        })

        if (!firstMission) {
          firstMission = {
            ...mission,
            missao_contextos: {
              missao_id: mission.missao_id,
              criada_por_id: user.usuario_id,
              responsavel_id: responsavelId,
            },
          } as MissionRecord
        }
        existingKeys.add(key)
      }

      if (!firstMission) {
        throw new HttpException("A frequência semanal não gera novas ordens dentro da janela permitida.", HttpStatus.BAD_REQUEST)
      }
      return firstMission
    })

    return created as MissionRecord
  }

  async listDailyOperational(user: UserRecord): Promise<MissionRecord[]> {
    if (user.active_mode === "soldier") {
      return (await this.soldierBoard(user)).daily_missions
    }

    const today = this.today(user)
    const missions = await this.listAllForUser(user)
    return this.sortForBoard(missions.filter((mission) => this.belongsToOperationalDate(mission, today)))
  }

  async operationalTurn(user: UserRecord): Promise<OperationalTurn> {
    return (await this.soldierBoard(user)).turn
  }

  async soldierBoard(user: UserRecord): Promise<{
    turn: OperationalTurn
    action_missions: MissionRecord[]
    daily_missions: MissionRecord[]
  }> {
    ensureSoldier(user)
    const today = this.today(user)
    const missions = await this.listAllForUser(user)
    const previousPending = missions.filter(
      (mission) => mission.status === MISSION_STATUS.pending && mission.prazo && isoDateFromDate(mission.prazo)! < today,
    )
    const todayMissions = this.sortForBoard(missions.filter((mission) => this.belongsToOperationalDate(mission, today)))
    const actionMissions = this.sortForBoard(todayMissions.filter((mission) => this.visibleToSoldier(mission, today)))
    const requiresDecision = previousPending.length > 0

    return {
      turn: {
        active_date: today,
        active_date_label: today,
        previous_operational_date: today,
        current_calendar_date: today,
        before_cutoff: false,
        current_day_available: true,
        requires_decision: requiresDecision,
        auto_advanced: !requiresDecision,
        previous_pending_count: previousPending.length,
        current_missions_count: todayMissions.length,
      },
      daily_missions: todayMissions,
      action_missions: requiresDecision ? this.sortForBoard(previousPending) : actionMissions,
    }
  }

  async closePreviousOperationalTurn(user: UserRecord): Promise<OperationalTurn> {
    ensureSoldier(user)
    const today = this.today(user)
    const missions = await this.listAllForUser(user)
    const previousPending = missions.filter(
      (mission) => mission.status === MISSION_STATUS.pending && mission.prazo && isoDateFromDate(mission.prazo)! < today,
    )
    if (previousPending.length === 0) {
      return this.operationalTurn(user)
    }

    const now = new Date()
    await this.prisma.$transaction(
      previousPending.flatMap((mission) => [
        this.prisma.missoes.update({
          where: { missao_id: mission.missao_id },
          data: {
            status: MISSION_STATUS.failed,
            completed_at: null,
            failed_at: now,
            failure_reason_type: null,
            failure_reason: null,
            soldier_excuse: null,
            general_verdict: null,
          },
        }),
        this.prisma.auditoria_eventos.create({
          data: {
            missao_id: mission.missao_id,
            usuario_id: user.usuario_id,
            acao: "missao_falhou",
            detalhes: `Missão '${mission.titulo}' encerrada na transição operacional.`,
          },
        }),
      ]),
    )

    return {
      active_date: today,
      active_date_label: today,
      previous_operational_date: today,
      current_calendar_date: today,
      before_cutoff: false,
      current_day_available: true,
      requires_decision: false,
      auto_advanced: true,
      previous_pending_count: 0,
      current_missions_count: (await this.listDailyOperational(user)).length,
    }
  }

  async update(id: number, payload: UpdateMissionPayload, user: UserRecord): Promise<MissionRecord> {
    ensureGeneral(user)
    const current = await this.getMissionForUser(id, user)
    if (current.status !== MISSION_STATUS.pending && current.status !== MISSION_STATUS.completed && current.status !== MISSION_STATUS.failed) {
      throw new HttpException("Missão finalizada por revisão não pode ser editada pelo General.", HttpStatus.BAD_REQUEST)
    }

    const objetivoId = Object.prototype.hasOwnProperty.call(payload, "objetivo_id")
      ? optionalId(payload.objetivo_id, "Objetivo vinculado não encontrado.")
      : current.objetivo_id
    const sonhoId = Object.prototype.hasOwnProperty.call(payload, "sonho_id")
      ? optionalId(payload.sonho_id, "Sonho vinculado não encontrado.")
      : current.sonho_id
    if (objetivoId !== null && sonhoId !== null) {
      throw new HttpException("A ordem deve estar vinculada ao sonho ou ao objetivo, não aos dois.", HttpStatus.BAD_REQUEST)
    }
    await this.ensureStrategicLinks(user, objetivoId, sonhoId)

    const data: Record<string, unknown> = {}
    if (Object.prototype.hasOwnProperty.call(payload, "titulo")) {
      data.titulo = text(payload.titulo, "Título da missão é obrigatório.")
    }
    if (Object.prototype.hasOwnProperty.call(payload, "instrucao")) {
      data.instrucao = optionalText(payload.instrucao, MISSION_INSTRUCTION_MAX_LENGTH)
    }
    if (Object.prototype.hasOwnProperty.call(payload, "prioridade")) {
      data.prioridade = priority(payload.prioridade)
    }
    if (Object.prototype.hasOwnProperty.call(payload, "prazo")) {
      data.prazo = dateFromPayload(payload.prazo)
    }
    if (Object.prototype.hasOwnProperty.call(payload, "status")) {
      const status = statusFromPayload(payload.status)
      if (status === MISSION_STATUS.pending) {
        data.status = MISSION_STATUS.pending
        data.completed_at = null
        data.failed_at = null
        data.failure_reason_type = null
        data.failure_reason = null
        data.soldier_excuse = null
        data.general_verdict = null
      }
    }
    if (Object.prototype.hasOwnProperty.call(payload, "objetivo_id")) {
      data.objetivo_id = objetivoId
    }
    if (Object.prototype.hasOwnProperty.call(payload, "sonho_id")) {
      data.sonho_id = sonhoId
    }
    if (Object.prototype.hasOwnProperty.call(payload, "recurrence_weekdays")) {
      data.recurrence_weekdays = serializeWeekdays(recurrenceWeekdays(payload.recurrence_weekdays))
    }
    if (Object.prototype.hasOwnProperty.call(payload, "recurrence_end_date")) {
      data.recurrence_end_date = dateFromPayload(payload.recurrence_end_date)
    }
    if (Object.prototype.hasOwnProperty.call(payload, "duration_type")) {
      data.duration_type = durationType(payload.duration_type)
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const mission = await tx.missoes.update({
        where: { missao_id: id },
        data,
      })
      await tx.auditoria_eventos.create({
        data: {
          missao_id: id,
          usuario_id: user.usuario_id,
          acao: "missao_atualizada",
          detalhes: `Missão '${mission.titulo}' atualizada.`,
        },
      })
      return mission
    })

    return {
      ...updated,
      missao_contextos: current.missao_contextos ?? null,
    } as MissionRecord
  }

  async complete(id: number, user: UserRecord): Promise<MissionRecord> {
    ensureExecutionMode(user)
    const current = await this.getMissionForUser(id, user)
    if (current.status !== MISSION_STATUS.pending || current.completed_at !== null) {
      throw new HttpException("Missão não pode ser concluída neste estado.", HttpStatus.BAD_REQUEST)
    }
    const now = new Date()
    return this.updateExecutionState(id, user, {
      data: {
        status: MISSION_STATUS.completed,
        completed_at: now,
        failed_at: null,
        failure_reason_type: null,
        failure_reason: null,
        soldier_excuse: null,
        general_verdict: null,
      },
      action: "missao_concluida",
      details: `Missão '${current.titulo}' concluída.`,
      context: (current.missao_contextos as MissionContextRecord | null) ?? null,
    })
  }

  async fail(id: number, user: UserRecord): Promise<MissionRecord> {
    ensureExecutionMode(user)
    const current = await this.getMissionForUser(id, user)
    if (current.status !== MISSION_STATUS.pending) {
      throw new HttpException("Apenas missão pendente pode ser registrada como falha.", HttpStatus.BAD_REQUEST)
    }
    const now = new Date()
    return this.updateExecutionState(id, user, {
      data: {
        status: MISSION_STATUS.failed,
        completed_at: null,
        failed_at: now,
        failure_reason_type: null,
        failure_reason: null,
        soldier_excuse: null,
        general_verdict: null,
      },
      action: "missao_nao_realizada",
      details: `Missão '${current.titulo}' registrada como não realizada.`,
      context: (current.missao_contextos as MissionContextRecord | null) ?? null,
    })
  }

  async togglePin(id: number, user: UserRecord): Promise<MissionRecord> {
    ensureExecutionMode(user)
    const current = await this.getMissionForUser(id, user)
    if (current.status !== MISSION_STATUS.pending) {
      throw new HttpException("Prioridade disponível apenas para ordens pendentes.", HttpStatus.BAD_REQUEST)
    }
    const pinned = !current.is_pinned
    return this.updateExecutionState(id, user, {
      data: { is_pinned: pinned },
      action: pinned ? "missao_prioridade_fixada" : "missao_prioridade_removida",
      details: pinned ? "General fixou a missão no topo do dia." : "General removeu a missão do topo do dia.",
      context: (current.missao_contextos as MissionContextRecord | null) ?? null,
    })
  }

  async review(id: number, user: UserRecord): Promise<MissionRecord> {
    ensureGeneral(user)
    return this.getMissionForUser(id, user)
  }

  async delete(id: number, user: UserRecord): Promise<void> {
    ensureGeneral(user)
    const current = await this.getMissionForUser(id, user)
    if (current.status !== MISSION_STATUS.pending && current.status !== MISSION_STATUS.failed) {
      throw new HttpException("Apenas ordens pendentes ou falhas podem ser removidas pelo General.", HttpStatus.BAD_REQUEST)
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.auditoria_eventos.deleteMany({ where: { missao_id: id } })
      await tx.missao_contextos.deleteMany({ where: { missao_id: id } })
      await tx.missoes.delete({ where: { missao_id: id } })
      await tx.auditoria_eventos.create({
        data: {
          missao_id: null,
          usuario_id: user.usuario_id,
          acao: "missao_removida",
          detalhes: `Missão '${current.titulo}' removida.`,
        },
      })
    })
  }

  async missionHistory(id: number, user: UserRecord) {
    ensureGeneral(user)
    await this.getMissionForUser(id, user)
    return this.prisma.auditoria_eventos.findMany({
      where: { missao_id: id },
      orderBy: [{ criado_em: "asc" }, { evento_id: "asc" }],
    })
  }

  private async contextsForUser(user: UserRecord): Promise<{
    contexts: MissionContextRecord[]
    contextByMissionId: Map<number, MissionContextRecord>
  }> {
    const contexts = await this.prisma.missao_contextos.findMany({
      where: {
        responsavel_id: user.usuario_id,
      },
    })
    return {
      contexts,
      contextByMissionId: new Map(contexts.map((context) => [context.missao_id, context])),
    }
  }

  private async getMissionForUser(id: number, user: UserRecord): Promise<MissionRecord> {
    const context = await this.prisma.missao_contextos.findFirst({
      where: {
        missao_id: id,
        responsavel_id: user.usuario_id,
      },
    })
    if (!context) {
      throw new HttpException(`Missão ${id} não encontrada`, HttpStatus.NOT_FOUND)
    }

    const mission = await this.prisma.missoes.findUnique({ where: { missao_id: id } })
    if (!mission) {
      throw new HttpException(`Missão ${id} não encontrada`, HttpStatus.NOT_FOUND)
    }
    return {
      ...mission,
      missao_contextos: context,
    } as MissionRecord
  }

  private async materializeRecurrences(user: UserRecord, missions: MissionRecord[], contexts: MissionContextRecord[]): Promise<boolean> {
    const contextByMissionId = new Map(contexts.map((context) => [context.missao_id, context]))
    const existingKeys = new Set(missions.map((mission) => this.recurrenceKey(mission)))
    const today = startOfIsoDate(this.today(user))
    const windowEnd = addDays(today, RECURRENCE_WINDOW_DAYS - 1)
    const candidates = missions.filter(
      (mission) =>
        (mission.objetivo_id !== null || mission.sonho_id !== null) &&
        mission.recurrence_weekdays !== null &&
        (mission.duration_type === "ate_objetivo" || mission.duration_type === "prazo"),
    )
    if (candidates.length === 0) {
      return false
    }

    let materialized = false
    for (const mission of candidates) {
      const weekdays = recurrenceWeekdays(JSON.parse(mission.recurrence_weekdays ?? "null"))
      if (!weekdays) {
        continue
      }
      const limit = mission.duration_type === "prazo" && mission.recurrence_end_date && mission.recurrence_end_date < windowEnd ? mission.recurrence_end_date : windowEnd
      if (limit < today) {
        continue
      }
      for (const date of datesForRecurrence(today, limit, weekdays)) {
        const key = this.recurrenceKey({ ...mission, prazo: date })
        if (existingKeys.has(key)) {
          continue
        }
        const context = contextByMissionId.get(mission.missao_id)
        const created = await this.prisma.$transaction(async (tx) => {
          const next = await tx.missoes.create({
            data: {
              titulo: mission.titulo,
              prioridade: mission.prioridade,
              prazo: date,
              instrucao: mission.instrucao,
              status: MISSION_STATUS.pending,
              objetivo_id: mission.objetivo_id,
              sonho_id: mission.sonho_id,
              recurrence_weekdays: mission.recurrence_weekdays,
              recurrence_end_date: mission.recurrence_end_date,
              duration_type: mission.duration_type,
            },
          })
          await tx.missao_contextos.create({
            data: {
              missao_id: next.missao_id,
              criada_por_id: context?.criada_por_id ?? user.usuario_id,
              responsavel_id: context?.responsavel_id ?? user.usuario_id,
            },
          })
          await tx.auditoria_eventos.create({
            data: {
              missao_id: next.missao_id,
              usuario_id: user.usuario_id,
              acao: "missao_recorrente_criada",
              detalhes: `Recorrência gerou a ordem '${next.titulo}'.`,
            },
          })
          return next
        })
        existingKeys.add(this.recurrenceKey(created as MissionRecord))
        materialized = true
      }
    }
    return materialized
  }

  private async ensureStrategicLinks(user: UserRecord, objetivoId: number | null, sonhoId: number | null): Promise<void> {
    if (objetivoId !== null) {
      const objetivo = await this.prisma.objetivos.findFirst({
        where: { id: objetivoId, usuario_id: user.usuario_id },
      })
      if (!objetivo) {
        throw new HttpException("Objetivo vinculado não encontrado.", HttpStatus.BAD_REQUEST)
      }
    }
    if (sonhoId !== null) {
      const sonho = await this.prisma.sonhos.findFirst({
        where: { id: sonhoId, usuario_id: user.usuario_id },
      })
      if (!sonho) {
        throw new HttpException("Sonho vinculado não encontrado.", HttpStatus.BAD_REQUEST)
      }
    }
  }

  private async updateExecutionState(
    id: number,
    user: UserRecord,
    options: {
      data: Record<string, unknown>
      action: string
      details: string
      context: MissionContextRecord | null
    },
  ): Promise<MissionRecord> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const mission = await tx.missoes.update({
        where: { missao_id: id },
        data: options.data,
      })
      await tx.auditoria_eventos.create({
        data: {
          missao_id: id,
          usuario_id: user.usuario_id,
          acao: options.action,
          detalhes: options.details,
        },
      })
      return mission
    })
    return {
      ...updated,
      missao_contextos: options.context,
    } as MissionRecord
  }

  private today(user: UserRecord): string {
    return this.calendar.currentDateFor(new Date(), user.timezone)
  }

  private belongsToOperationalDate(mission: MissionRecord, isoDate: string): boolean {
    if (isoDateFromDate(mission.prazo) === isoDate) {
      return true
    }
    const eventDate = mission.completed_at ?? mission.failed_at
    return isoDateFromDate(eventDate) === isoDate
  }

  private visibleToSoldier(mission: MissionRecord, isoDate: string): boolean {
    const dueDate = isoDateFromDate(mission.prazo)
    return mission.status === MISSION_STATUS.pending && (dueDate === null || dueDate <= isoDate)
  }

  private sortForBoard(missions: MissionRecord[]): MissionRecord[] {
    return [...missions].sort((left, right) => {
      const pinned = Number(right.is_pinned) - Number(left.is_pinned)
      if (pinned !== 0) {
        return pinned
      }
      const finalized = Number(left.status !== MISSION_STATUS.pending) - Number(right.status !== MISSION_STATUS.pending)
      if (finalized !== 0) {
        return finalized
      }
      const leftDate = left.prazo ?? startOfIsoDate("9999-12-31")
      const rightDate = right.prazo ?? startOfIsoDate("9999-12-31")
      const dateDiff = leftDate.getTime() - rightDate.getTime()
      if (dateDiff !== 0) {
        return dateDiff
      }
      return left.missao_id - right.missao_id
    })
  }

  private recurrenceDates(start: Date, recurrenceEndDate: Date | null, weekdays: number[]): Date[] {
    const defaultLimit = addDays(start, RECURRENCE_WINDOW_DAYS - 1)
    const limit = recurrenceEndDate && recurrenceEndDate < defaultLimit ? recurrenceEndDate : defaultLimit
    if (limit < start) {
      throw new HttpException("Prazo da recorrência não pode ser anterior à data inicial.", HttpStatus.BAD_REQUEST)
    }
    return datesForRecurrence(start, limit, weekdays)
  }

  private recurrenceKey(mission: Pick<MissionRecord, "objetivo_id" | "sonho_id" | "titulo" | "instrucao" | "prazo">): string {
    return JSON.stringify([mission.objetivo_id, mission.sonho_id, mission.titulo, mission.instrucao, isoDateFromDate(mission.prazo)])
  }
}
