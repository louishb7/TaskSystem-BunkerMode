import { HttpException, HttpStatus, Injectable } from "@nestjs/common"

import { UserRecord } from "../auth/auth.types"
import { ensureGeneral, optionalText, positiveInt, requiredText } from "../common/domain-helpers"
import { PrismaService } from "../prisma/prisma.service"
import { DREAM_STATUS, DREAM_TYPE, DreamResponse, toDreamResponse } from "./dreams.types"

type CreateDreamPayload = {
  titulo?: unknown
  descricao?: unknown
  tipo?: unknown
}

type UpdateDreamPayload = {
  titulo?: unknown
  descricao?: unknown
}

type ArchiveDreamPayload = {
  justificativa?: unknown
}

function dreamType(value: unknown): string {
  if (value !== DREAM_TYPE.principal && value !== DREAM_TYPE.secondary) {
    throw new HttpException("Tipo de sonho inválido.", HttpStatus.BAD_REQUEST)
  }
  return value
}

@Injectable()
export class DreamsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: UserRecord): Promise<DreamResponse[]> {
    ensureGeneral(user)
    const dreams = await this.prisma.sonhos.findMany({
      where: { usuario_id: user.usuario_id },
      orderBy: [{ status: "asc" }, { tipo: "asc" }, { updated_at: "desc" }, { id: "desc" }],
    })
    return dreams.map(toDreamResponse)
  }

  async create(user: UserRecord, payload: CreateDreamPayload): Promise<DreamResponse> {
    ensureGeneral(user)
    const tipo = dreamType(payload.tipo)
    await this.ensureActiveLimits(user.usuario_id, tipo)
    const now = new Date()
    const dream = await this.prisma.sonhos.create({
      data: {
        usuario_id: user.usuario_id,
        titulo: requiredText(payload.titulo, "Título do sonho é obrigatório.", 200),
        descricao: optionalText(payload.descricao, "Descrição do sonho inválida."),
        tipo,
        status: DREAM_STATUS.active,
        created_at: now,
        updated_at: now,
      },
    })
    return toDreamResponse(dream)
  }

  async update(user: UserRecord, dreamId: number, payload: UpdateDreamPayload): Promise<DreamResponse> {
    ensureGeneral(user)
    const existing = await this.findOwned(user, dreamId)
    const dream = await this.prisma.sonhos.update({
      where: { id: existing.id },
      data: {
        ...(payload.titulo !== undefined ? { titulo: requiredText(payload.titulo, "Título do sonho é obrigatório.", 200) } : {}),
        ...(payload.descricao !== undefined ? { descricao: optionalText(payload.descricao, "Descrição do sonho inválida.") } : {}),
        updated_at: new Date(),
      },
    })
    return toDreamResponse(dream)
  }

  async archive(user: UserRecord, dreamId: number, payload: ArchiveDreamPayload): Promise<DreamResponse> {
    ensureGeneral(user)
    const existing = await this.findOwned(user, dreamId)
    const now = new Date()
    const dream = await this.prisma.sonhos.update({
      where: { id: existing.id },
      data: {
        status: DREAM_STATUS.archived,
        justificativa_arquivamento: requiredText(payload.justificativa, "Justificativa de arquivamento é obrigatória."),
        archived_at: now,
        updated_at: now,
      },
    })
    return toDreamResponse(dream)
  }

  async promote(user: UserRecord, dreamId: number): Promise<DreamResponse> {
    ensureGeneral(user)
    const id = positiveInt(dreamId, "Sonho não encontrado.")
    const promoted = await this.prisma.$transaction(async (tx) => {
      const target = await tx.sonhos.findFirst({
        where: { id, usuario_id: user.usuario_id, status: DREAM_STATUS.active },
      })
      if (!target) {
        throw new HttpException("Sonho não encontrado.", HttpStatus.BAD_REQUEST)
      }
      const now = new Date()
      await tx.sonhos.updateMany({
        where: { usuario_id: user.usuario_id, status: DREAM_STATUS.active, tipo: DREAM_TYPE.principal },
        data: { tipo: DREAM_TYPE.secondary, updated_at: now },
      })
      return tx.sonhos.update({
        where: { id },
        data: { tipo: DREAM_TYPE.principal, updated_at: now },
      })
    })
    return toDreamResponse(promoted)
  }

  private async ensureActiveLimits(userId: number, tipo: string): Promise<void> {
    const [total, principal, secondary] = await Promise.all([
      this.prisma.sonhos.count({ where: { usuario_id: userId, status: DREAM_STATUS.active } }),
      this.prisma.sonhos.count({ where: { usuario_id: userId, status: DREAM_STATUS.active, tipo: DREAM_TYPE.principal } }),
      this.prisma.sonhos.count({ where: { usuario_id: userId, status: DREAM_STATUS.active, tipo: DREAM_TYPE.secondary } }),
    ])
    if (total >= 4) {
      throw new HttpException("Limite de quatro sonhos ativos atingido.", HttpStatus.BAD_REQUEST)
    }
    if (tipo === DREAM_TYPE.principal && principal >= 1) {
      throw new HttpException("Já existe um sonho principal ativo.", HttpStatus.BAD_REQUEST)
    }
    if (tipo === DREAM_TYPE.secondary && secondary >= 3) {
      throw new HttpException("Limite de três sonhos secundários ativos atingido.", HttpStatus.BAD_REQUEST)
    }
  }

  private async findOwned(user: UserRecord, dreamId: number) {
    const id = positiveInt(dreamId, "Sonho não encontrado.")
    const dream = await this.prisma.sonhos.findFirst({ where: { id, usuario_id: user.usuario_id } })
    if (!dream) {
      throw new HttpException("Sonho não encontrado.", HttpStatus.BAD_REQUEST)
    }
    return dream
  }
}
