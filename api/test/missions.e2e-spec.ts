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
    timezone: "America/Recife",
    created_at: new Date("2026-04-24T12:00:00.000Z"),
    updated_at: new Date("2026-04-24T12:00:00.000Z"),
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
    updated_at: new Date("2026-04-24T12:00:00.000Z"),
    completed_at: null,
    failed_at: null,
    recurrence_weekdays: [],
    recurrence_end_date: null,
    duration_type: null,
    recurrence_key: null,
    recurrence_series_id: null,
    criada_por_id: 7,
    responsavel_id: 7,
    objetivo_id: null,
    sonho_id: null,
    ...overrides,
  }
}

function prismaMock() {
  return {
    $transaction: jest.fn(),
    auditoria_eventos: {
      create: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    missoes: {
      create: jest.fn(),
      createManyAndReturn: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
    },
    objetivos: {
      findFirst: jest.fn(),
    },
    series_recorrencia: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn(),
    },
    sonhos: {
      findFirst: jest.fn(),
    },
  }
}

describe("Missions clean domain", () => {
  const calendar = new OperationalCalendarService()

  it("maps the mission contract consumed by the web", () => {
    const response = toMissionResponse(mission(), user())

    expect(response).toMatchObject({
      id: 10,
      titulo: "Revisar plano semanal",
      prazo: "25-04-2026",
      status: "PENDENTE",
      status_code: "PENDENTE",
      status_label: "Pendente",
      user_id: 7,
      responsavel_id: 7,
    })
    expect(Object.keys(response)).toEqual(expect.arrayContaining(["status", "status_code", "permissions"]))
    expect(response.permissions).toEqual({
      can_complete: true,
      can_edit: true,
      can_delete: true,
      can_fail: true,
      can_pin: true,
      can_view_history: false,
    })
  })

  it("uses the recurrence series as the V2 recurrence response source", () => {
    const response = toMissionResponse(
      mission({
        recurrence_series_id: 21,
        recurrence_weekdays: [6],
        recurrence_end_date: new Date("2026-05-30T00:00:00.000Z"),
        duration_type: "ate_objetivo",
        serie_recorrencia: {
          recurrence_series_id: 21,
          recurrence_weekdays: [0, 2, 4],
          termination_policy: "ate_data",
          end_date: new Date("2026-05-15T00:00:00.000Z"),
        },
      }),
      user(),
    )

    expect(response.recurrence).toEqual({
      series_id: 21,
      weekdays: [0, 2, 4],
      termination_policy: "ate_data",
      end_date: "15-05-2026",
    })
  })

  it("keeps legacy recurrence fields readable while the series migration coexists", () => {
    const response = toMissionResponse(
      mission({
        recurrence_weekdays: [1, 3],
        recurrence_end_date: new Date("2026-05-30T00:00:00.000Z"),
        duration_type: "prazo",
      }),
      user(),
    )

    expect(response).toMatchObject({
      recurrence: null,
      recurrence_weekdays: [1, 3],
      recurrence_end_date: "30-05-2026",
      duration_type: "prazo",
    })
  })

  it("creates a manual mission with direct ownership and audit event", async () => {
    const prisma = prismaMock()
    const createdMission = mission()
    const create = jest.fn().mockResolvedValue(createdMission)
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        auditoria_eventos: prisma.auditoria_eventos,
        missoes: { create, findUnique: prisma.missoes.findUnique },
      }),
    )
    const service = new MissionsService(prisma as unknown as PrismaService, calendar)

    const result = await service.create(
      {
        titulo: " Revisar plano semanal ",
        instrucao: " Abrir relatório ",
        prazo: "25-04-2026",
        responsavel_id: 7,
      },
      user(),
    )

    expect(result.missao_id).toBe(10)
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        titulo: "Revisar plano semanal",
        instrucao: "Abrir relatório",
        status: MISSION_STATUS.pending,
        criada_por_id: 7,
        responsavel_id: 7,
      }),
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

  it("creates a recurrence series and materializes occurrences without legacy keys", async () => {
    const prisma = prismaMock()
    const createdMissions = [
      mission({ missao_id: 10, prazo: new Date("2026-04-24T00:00:00.000Z") }),
      mission({ missao_id: 11, prazo: new Date("2026-04-27T00:00:00.000Z") }),
      mission({ missao_id: 12, prazo: new Date("2026-04-29T00:00:00.000Z") }),
      mission({ missao_id: 13, prazo: new Date("2026-05-01T00:00:00.000Z") }),
      mission({ missao_id: 14, prazo: new Date("2026-05-04T00:00:00.000Z") }),
      mission({ missao_id: 15, prazo: new Date("2026-05-06T00:00:00.000Z") }),
    ]
    const series = {
      recurrence_series_id: 21,
      responsavel_id: 7,
      objetivo_id: 7,
      titulo: "Treinar escrita",
      instrucao: null,
      prioridade: 2,
      recurrence_weekdays: [0, 2, 4],
      start_date: new Date("2026-04-24T00:00:00.000Z"),
      termination_policy: "ate_objetivo",
      end_date: null,
      ativo: true,
      created_at: new Date("2026-04-24T12:00:00.000Z"),
      updated_at: new Date("2026-04-24T12:00:00.000Z"),
    }
    prisma.series_recorrencia.create.mockResolvedValue(series)
    prisma.missoes.createManyAndReturn.mockResolvedValue(createdMissions)
    prisma.objetivos.findFirst.mockResolvedValue({ id: 7, usuario_id: 7, status: "ativo", sonhos: null })
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        auditoria_eventos: prisma.auditoria_eventos,
        missoes: { createManyAndReturn: prisma.missoes.createManyAndReturn },
        series_recorrencia: prisma.series_recorrencia,
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
    expect(prisma.series_recorrencia.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        objetivo_id: 7,
        recurrence_weekdays: [0, 2, 4],
        termination_policy: "ate_objetivo",
      }),
    })
    const occurrenceCall = prisma.missoes.createManyAndReturn.mock.calls[0][0]
    expect(occurrenceCall.data.map((item: { prazo: Date }) => item.prazo.toISOString().slice(0, 10))).toEqual([
      "2026-04-24",
      "2026-04-27",
      "2026-04-29",
      "2026-05-01",
      "2026-05-04",
      "2026-05-06",
    ])
    expect(occurrenceCall.skipDuplicates).toBe(true)
    expect(occurrenceCall.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          recurrence_series_id: 21,
          recurrence_key: null,
          recurrence_weekdays: [],
          sonho_id: null,
        }),
      ]),
    )
  })

  it("fails overdue pending missions before showing the Soldier board", async () => {
    const prisma = prismaMock()
    prisma.missoes.findMany
      .mockResolvedValueOnce([mission({ missao_id: 10, prazo: new Date("2026-08-12T00:00:00.000Z") })])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        mission({
          missao_id: 10,
          prazo: new Date("2026-08-12T00:00:00.000Z"),
          status: MISSION_STATUS.failed,
          failed_at: new Date("2026-08-13T12:00:00.000Z"),
        }),
        mission({ missao_id: 11, prazo: new Date("2026-08-13T00:00:00.000Z") }),
      ])
    prisma.$transaction.mockResolvedValue([])
    const service = new MissionsService(prisma as unknown as PrismaService, calendar)
    jest.useFakeTimers().setSystemTime(new Date("2026-08-13T12:00:00.000Z"))

    const board = await service.soldierBoard(user({ active_mode: "soldier" }))

    expect(board.action_missions.map((item) => item.missao_id)).toEqual([11])
    expect(prisma.$transaction).toHaveBeenCalled()
    jest.useRealTimers()
  })

  it("preserves completed and failed missions in history by allowing delete only while pending", async () => {
    const prisma = prismaMock()
    prisma.missoes.findFirst.mockResolvedValue(mission({ status: MISSION_STATUS.failed }))
    const service = new MissionsService(prisma as unknown as PrismaService, calendar)

    await expect(service.delete(10, user())).rejects.toMatchObject({
      status: 400,
    })
    expect(prisma.missoes.delete).not.toHaveBeenCalled()
  })
})
