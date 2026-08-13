import { HttpException, HttpStatus, Injectable } from "@nestjs/common"

import { UserRecord } from "../auth/auth.types"
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

function ensureGeneral(user: UserRecord): void {
  if (user.active_mode !== "general") {
    throw new HttpException("Planejamento indisponível enquanto o modo Soldado estiver ativo.", HttpStatus.FORBIDDEN)
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

function unsupportedPhase5Field(value: unknown, message: string): void {
  if (value !== null && value !== undefined) {
    throw new HttpException(message, HttpStatus.BAD_REQUEST)
  }
}

function recurrenceWeekdays(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }
  if (Array.isArray(value) && value.length === 0) {
    return null
  }
  throw new HttpException("Recorrência será migrada junto da etapa de Operações/Montanha.", HttpStatus.BAD_REQUEST)
}

function durationType(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null
  }
  if (value === "pontual") {
    return value
  }
  throw new HttpException("Duração estratégica recorrente será migrada junto da etapa de Montanha.", HttpStatus.BAD_REQUEST)
}

@Injectable()
export class MissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForGeneralBoard(user: UserRecord): Promise<MissionRecord[]> {
    const contexts = await this.prisma.missao_contextos.findMany({
      where: {
        responsavel_id: user.usuario_id,
      },
      include: {
        operacoes: true,
      },
    })
    const contextByMissionId = new Map(contexts.map((context) => [context.missao_id, context]))
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

  async create(payload: CreateMissionPayload, user: UserRecord): Promise<MissionRecord> {
    ensureGeneral(user)

    const recurrence = recurrenceWeekdays(payload.recurrence_weekdays)
    const duration = durationType(payload.duration_type)
    unsupportedPhase5Field(payload.recurrence_end_date, "Recorrência será migrada junto da etapa de Operações/Montanha.")

    const objetivoId = optionalId(payload.objetivo_id, "Objetivo vinculado não encontrado.")
    const sonhoId = optionalId(payload.sonho_id, "Sonho vinculado não encontrado.")
    if (objetivoId !== null && sonhoId !== null) {
      throw new HttpException("A ordem deve estar vinculada ao sonho ou ao objetivo, não aos dois.", HttpStatus.BAD_REQUEST)
    }

    const responsavelId = optionalId(payload.responsavel_id, "Responsável inválido.") ?? user.usuario_id
    if (responsavelId !== user.usuario_id) {
      throw new HttpException("Responsável inválido.", HttpStatus.BAD_REQUEST)
    }

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

    const created = await this.prisma.$transaction(async (tx) => {
      const mission = await tx.missoes.create({
        data: {
          titulo: text(payload.titulo, "Título da missão é obrigatório."),
          prioridade: priority(payload.prioridade),
          prazo: dateFromPayload(payload.prazo),
          instrucao: optionalText(payload.instrucao, MISSION_INSTRUCTION_MAX_LENGTH),
          status: MISSION_STATUS.pending,
          objetivo_id: objetivoId,
          sonho_id: sonhoId,
          recurrence_weekdays: recurrence,
          duration_type: duration,
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
          acao: "missao_criada",
          detalhes: `Missão '${mission.titulo}' criada.`,
        },
      })

      return {
        ...mission,
        missao_contextos: {
          missao_id: mission.missao_id,
          criada_por_id: user.usuario_id,
          responsavel_id: responsavelId,
          operacao_id: null,
          operacao_dia: null,
          operacoes: null,
        },
      }
    })

    return created as MissionRecord
  }
}
