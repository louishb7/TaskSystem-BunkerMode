import { HttpException } from "@nestjs/common"

import { UserRecord } from "../src/auth/auth.types"
import { toMissionResponse } from "../src/missions/mission-response"
import { MissionsService } from "../src/missions/missions.service"
import { MISSION_STATUS, MissionRecord } from "../src/missions/mission.types"
import { PrismaService } from "../src/prisma/prisma.service"

function user(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    usuario_id: 7,
    usuario: "general",
    email: "general@bunker.local",
    senha_hash: "hash",
    ativo: true,
    nome_general: null,
    active_mode: "general",
    planning_window: "night",
    timezone: "America/Recife",
    emergency_unlock_date: null,
    timezone_updated_at: null,
    ...overrides,
  }
}

function mission(overrides: Partial<MissionRecord> = {}): MissionRecord {
  return {
    missao_id: 10,
    titulo: "Revisar plano semanal",
    prioridade: 2,
    prazo: new Date("2026-04-25T00:00:00.000Z"),
    instrucao: "Abrir relatório e registrar decisões.",
    status: MISSION_STATUS.pending,
    is_pinned: false,
    created_at: new Date("2026-04-24T12:00:00.000Z"),
    completed_at: null,
    failed_at: null,
    failure_reason_type: null,
    failure_reason: null,
    soldier_excuse: null,
    general_verdict: null,
    recurrence_weekdays: null,
    recurrence_end_date: null,
    duration_type: null,
    objetivo_id: null,
    sonho_id: null,
    missao_contextos: {
      responsavel_id: 7,
      operacao_id: null,
      operacoes: null,
    },
    ...overrides,
  }
}

function prismaMock() {
  return {
    $transaction: jest.fn(),
    auditoria_eventos: {
      create: jest.fn(),
    },
    missao_contextos: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    missoes: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    objetivos: {
      findFirst: jest.fn(),
    },
    sonhos: {
      findFirst: jest.fn(),
    },
  }
}

describe("Missions phase 5", () => {
  it("maps the mission contract consumed by the web", () => {
    const response = toMissionResponse(mission(), user())

    expect(response).toMatchObject({
      id: 10,
      titulo: "Revisar plano semanal",
      prazo: "25-04-2026",
      due_date: "25-04-2026",
      status: "Pendente",
      status_code: "PENDENTE",
      status_label: "Pendente",
      user_id: 7,
      requires_immediate_justification: false,
      has_pending_non_blocking_justification: false,
      is_previous_operational_pending: false,
    })
    expect(response.permissions).toEqual({
      can_complete: true,
      can_edit: true,
      can_delete: true,
      can_justify: false,
      can_fail: true,
      can_pin: true,
      can_review: false,
      can_view_history: false,
    })
  })

  it("creates a manual mission with ownership context and audit event", async () => {
    const prisma = prismaMock()
    const createdMission = mission()
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        auditoria_eventos: prisma.auditoria_eventos,
        missao_contextos: prisma.missao_contextos,
        missoes: {
          create: jest.fn().mockResolvedValue(createdMission),
        },
      }),
    )
    const service = new MissionsService(prisma as unknown as PrismaService)

    const result = await service.create(
      {
        titulo: " Revisar plano semanal ",
        instrucao: " Abrir relatório ",
        prazo: "25-04-2026",
        responsavel_id: 7,
        recurrence_weekdays: null,
        recurrence_end_date: null,
        duration_type: null,
      },
      user(),
    )

    expect(result.missao_id).toBe(10)
    expect(prisma.missao_contextos.create).toHaveBeenCalledWith({
      data: {
        missao_id: 10,
        criada_por_id: 7,
        responsavel_id: 7,
      },
    })
    expect(prisma.auditoria_eventos.create).toHaveBeenCalledWith({
      data: {
        missao_id: 10,
        usuario_id: 7,
        acao: "missao_criada",
        detalhes: "Missão 'Revisar plano semanal' criada.",
      },
    })
  })

  it("rejects planning while the user is in Soldier mode", async () => {
    const service = new MissionsService(prismaMock() as unknown as PrismaService)

    await expect(
      service.create({ titulo: "Ordem", responsavel_id: 7 }, user({ active_mode: "soldier" })),
    ).rejects.toMatchObject({
      status: 403,
    })
  })

  it("lists only missions owned by the current user context", async () => {
    const prisma = prismaMock()
    prisma.missao_contextos.findMany.mockResolvedValue([
      {
        missao_id: 10,
        responsavel_id: 7,
        operacao_id: null,
        operacoes: null,
      },
    ])
    prisma.missoes.findMany.mockResolvedValue([mission({ missao_contextos: undefined })])
    const service = new MissionsService(prisma as unknown as PrismaService)

    const result = await service.listForGeneralBoard(user())

    expect(result[0].missao_contextos?.responsavel_id).toBe(7)
    expect(prisma.missao_contextos.findMany).toHaveBeenCalledWith({
      where: { responsavel_id: 7 },
      include: { operacoes: true },
    })
    expect(prisma.missoes.findMany).toHaveBeenCalledWith({
      where: {
        missao_id: { in: [10] },
        status: MISSION_STATUS.pending,
      },
      orderBy: [{ is_pinned: "desc" }, { prazo: "asc" }, { missao_id: "asc" }],
    })
  })

  it("keeps recurring missions outside this slice", async () => {
    const service = new MissionsService(prismaMock() as unknown as PrismaService)

    await expect(
      service.create(
        {
          titulo: "Treinar",
          responsavel_id: 7,
          recurrence_weekdays: [0, 2],
          duration_type: "prazo",
        },
        user(),
      ),
    ).rejects.toBeInstanceOf(HttpException)
  })
})
