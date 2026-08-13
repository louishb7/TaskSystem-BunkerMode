import { UserRecord } from "../src/auth/auth.types"
import { OperationalCalendarService } from "../src/calendar/operational-calendar.service"
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
    },
    ...overrides,
  }
}

function prismaMock() {
  return {
    $transaction: jest.fn(),
    auditoria_eventos: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    missao_contextos: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    missoes: {
      create: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
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
  const calendar = new OperationalCalendarService()

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
    const service = new MissionsService(prisma as unknown as PrismaService, calendar)

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
    const service = new MissionsService(prismaMock() as unknown as PrismaService, calendar)

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
      },
    ])
    prisma.missoes.findMany.mockResolvedValue([mission({ missao_contextos: undefined })])
    const service = new MissionsService(prisma as unknown as PrismaService, calendar)

    const result = await service.listForGeneralBoard(user())

    expect(result[0].missao_contextos?.responsavel_id).toBe(7)
    expect(prisma.missao_contextos.findMany).toHaveBeenCalledWith({
      where: { responsavel_id: 7 },
    })
    expect(prisma.missoes.findMany).toHaveBeenCalledWith({
      where: {
        missao_id: { in: [10] },
        status: MISSION_STATUS.pending,
      },
      orderBy: [{ is_pinned: "desc" }, { prazo: "asc" }, { missao_id: "asc" }],
    })
  })

  it("materializes recurring strategic missions in the current 14-day window", async () => {
    const prisma = prismaMock()
    const createdMissions = [
      mission({ missao_id: 10, prazo: new Date("2026-04-24T00:00:00.000Z") }),
      mission({ missao_id: 11, prazo: new Date("2026-04-27T00:00:00.000Z") }),
      mission({ missao_id: 12, prazo: new Date("2026-04-29T00:00:00.000Z") }),
      mission({ missao_id: 13, prazo: new Date("2026-05-01T00:00:00.000Z") }),
      mission({ missao_id: 14, prazo: new Date("2026-05-04T00:00:00.000Z") }),
      mission({ missao_id: 15, prazo: new Date("2026-05-06T00:00:00.000Z") }),
    ]
    const create = jest.fn()
    createdMissions.forEach((created) => create.mockResolvedValueOnce(created))
    prisma.objetivos.findFirst.mockResolvedValue({ id: 7, usuario_id: 7 })
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        auditoria_eventos: prisma.auditoria_eventos,
        missao_contextos: prisma.missao_contextos,
        missoes: { create },
      }),
    )
    const service = new MissionsService(prisma as unknown as PrismaService, calendar)

    const result = await service.create(
      {
        titulo: "Treinar escrita",
        prazo: "24-04-2026",
        objetivo_id: 7,
        responsavel_id: 7,
        recurrence_weekdays: [0, 2, 4],
        duration_type: "ate_objetivo",
      },
      user(),
    )

    expect(result.missao_id).toBe(10)
    expect(create).toHaveBeenCalledTimes(6)
    expect(create.mock.calls.map(([call]) => call.data.prazo.toISOString().slice(0, 10))).toEqual([
      "2026-04-24",
      "2026-04-27",
      "2026-04-29",
      "2026-05-01",
      "2026-05-04",
      "2026-05-06",
    ])
  })

  it("shows previous pending missions as Soldier actions without a time cutoff", async () => {
    const prisma = prismaMock()
    prisma.missao_contextos.findMany.mockResolvedValue([
      { missao_id: 10, criada_por_id: 7, responsavel_id: 7 },
      { missao_id: 11, criada_por_id: 7, responsavel_id: 7 },
    ])
    prisma.missoes.findMany.mockResolvedValue([
      mission({ missao_id: 10, prazo: new Date("2026-08-12T00:00:00.000Z") }),
      mission({ missao_id: 11, prazo: new Date("2026-08-13T00:00:00.000Z") }),
    ])
    const service = new MissionsService(prisma as unknown as PrismaService, calendar)
    jest.useFakeTimers().setSystemTime(new Date("2026-08-13T12:00:00.000Z"))

    const board = await service.soldierBoard(user({ active_mode: "soldier" }))

    expect(board.turn).toMatchObject({
      active_date: "2026-08-13",
      before_cutoff: false,
      requires_decision: true,
      previous_pending_count: 1,
    })
    expect(board.action_missions.map((item) => item.missao_id)).toEqual([10])
    jest.useRealTimers()
  })

  it("completes a mission and records audit in the same transaction", async () => {
    const prisma = prismaMock()
    prisma.missao_contextos.findFirst.mockResolvedValue({
      missao_id: 10,
      criada_por_id: 7,
      responsavel_id: 7,
    })
    prisma.missoes.findUnique.mockResolvedValue(mission())
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        auditoria_eventos: prisma.auditoria_eventos,
        missoes: {
          update: jest.fn().mockResolvedValue(
            mission({
              status: MISSION_STATUS.completed,
              completed_at: new Date("2026-08-13T12:00:00.000Z"),
            }),
          ),
        },
      }),
    )
    const service = new MissionsService(prisma as unknown as PrismaService, calendar)

    const result = await service.complete(10, user())

    expect(result.status).toBe(MISSION_STATUS.completed)
    expect(prisma.auditoria_eventos.create).toHaveBeenCalledWith({
      data: {
        missao_id: 10,
        usuario_id: 7,
        acao: "missao_concluida",
        detalhes: "Missão 'Revisar plano semanal' concluída.",
      },
    })
  })

  it("deletes only removable General missions and removes dependent runtime records", async () => {
    const prisma = prismaMock()
    prisma.missao_contextos.findFirst.mockResolvedValue({
      missao_id: 10,
      criada_por_id: 7,
      responsavel_id: 7,
    })
    prisma.missoes.findUnique.mockResolvedValue(mission({ status: MISSION_STATUS.failed }))
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        auditoria_eventos: prisma.auditoria_eventos,
        missao_contextos: prisma.missao_contextos,
        missoes: prisma.missoes,
      }),
    )
    const service = new MissionsService(prisma as unknown as PrismaService, calendar)

    await service.delete(10, user())

    expect(prisma.auditoria_eventos.deleteMany).toHaveBeenCalledWith({ where: { missao_id: 10 } })
    expect(prisma.missao_contextos.deleteMany).toHaveBeenCalledWith({ where: { missao_id: 10 } })
    expect(prisma.missoes.delete).toHaveBeenCalledWith({ where: { missao_id: 10 } })
  })
})
