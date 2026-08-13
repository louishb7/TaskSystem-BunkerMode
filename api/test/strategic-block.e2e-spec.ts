import { OperationalCalendarService } from "../src/calendar/operational-calendar.service"
import { DreamsService } from "../src/dreams/dreams.service"
import { GoalsService } from "../src/goals/goals.service"
import { MountainService } from "../src/mountain/mountain.service"
import { ReviewsService } from "../src/reviews/reviews.service"
import { MISSION_STATUS, MissionRecord } from "../src/missions/mission.types"
import { UserRecord } from "../src/auth/auth.types"

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

function dream(overrides = {}) {
  return {
    id: 1,
    usuario_id: 7,
    titulo: "Topo principal",
    descricao: null,
    tipo: "principal",
    status: "ativo",
    justificativa_arquivamento: null,
    created_at: new Date("2026-05-01T10:00:00.000Z"),
    updated_at: new Date("2026-05-01T10:00:00.000Z"),
    archived_at: null,
    concluded_at: null,
    objetivos: [],
    missoes: [],
    usuarios: {},
    ...overrides,
  }
}

function goal(overrides = {}) {
  return {
    id: 3,
    usuario_id: 7,
    sonho_id: 1,
    titulo: "Tomar posição",
    descricao: null,
    data_alvo: new Date("2026-06-01T00:00:00.000Z"),
    progresso: 20,
    status: "ativo",
    order_index: 1,
    created_at: new Date("2026-05-01T10:00:00.000Z"),
    updated_at: new Date("2026-05-01T10:00:00.000Z"),
    concluded_at: null,
    missoes: [],
    sonhos: null,
    usuarios: {},
    ...overrides,
  }
}

function mission(overrides: Partial<MissionRecord> = {}): MissionRecord {
  return {
    missao_id: 10,
    titulo: "Executar ordem",
    prioridade: 2,
    prazo: new Date("2026-05-18T00:00:00.000Z"),
    instrucao: null,
    status: MISSION_STATUS.completed,
    is_pinned: true,
    created_at: new Date("2026-05-18T08:00:00.000Z"),
    completed_at: new Date("2026-05-18T12:00:00.000Z"),
    failed_at: null,
    failure_reason_type: null,
    failure_reason: null,
    soldier_excuse: null,
    general_verdict: null,
    recurrence_weekdays: null,
    recurrence_end_date: null,
    duration_type: null,
    objetivo_id: 3,
    sonho_id: null,
    missao_contextos: { responsavel_id: 7 },
    ...overrides,
  }
}

describe("Execution Block B strategic modules", () => {
  it("creates and maps dreams with the active principal limit", async () => {
    const prisma = {
      sonhos: {
        count: jest.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(0).mockResolvedValueOnce(0),
        create: jest.fn().mockResolvedValue(dream({ titulo: "Campanha principal" })),
      },
    }
    const service = new DreamsService(prisma as never)

    const result = await service.create(user(), {
      titulo: " Campanha principal ",
      descricao: "",
      tipo: "principal",
    })

    expect(result).toMatchObject({
      id: 1,
      titulo: "Campanha principal",
      tipo: "principal",
      status: "ativo",
    })
    expect(prisma.sonhos.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        usuario_id: 7,
        titulo: "Campanha principal",
        descricao: null,
        tipo: "principal",
        status: "ativo",
      }),
    })
  })

  it("creates goals linked to owned dreams with the next route order", async () => {
    const prisma = {
      sonhos: {
        findFirst: jest.fn().mockResolvedValue(dream()),
      },
      objetivos: {
        aggregate: jest.fn().mockResolvedValue({ _max: { order_index: 2 } }),
        create: jest.fn().mockResolvedValue(goal({ order_index: 3 })),
      },
    }
    const service = new GoalsService(prisma as never)

    const result = await service.create(user(), {
      titulo: " Tomar posição ",
      sonho_id: 1,
      data_alvo: "2026-06-01",
      progresso: 20,
    })

    expect(result).toMatchObject({ id: 3, sonho_id: 1, order_index: 3, data_alvo: "2026-06-01" })
    expect(prisma.objetivos.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        usuario_id: 7,
        sonho_id: 1,
        titulo: "Tomar posição",
        order_index: 3,
      }),
    })
  })

  it("aggregates mountain data without a separate Operations dependency", async () => {
    const dreams = { list: jest.fn().mockResolvedValue([dream()]) }
    const goals = { list: jest.fn().mockResolvedValue([goal()]) }
    const missions = { listAllForUser: jest.fn().mockResolvedValue([mission()]) }
    const service = new MountainService(dreams as never, goals as never, missions as never)

    const result = await service.getMountain(user())

    expect(result.sonhos).toHaveLength(1)
    expect(result.objetivos).toHaveLength(1)
    expect(result.missions[0]).toMatchObject({ id: 10, titulo: "Executar ordem", objetivo_id: 3 })
    expect(result.daily_missions[0]).toMatchObject({ id: 10 })
  })

  it("builds review state, weekly report and General support from persisted missions", async () => {
    const missions = {
      listAllForUser: jest.fn().mockResolvedValue([
        mission(),
        mission({
          missao_id: 11,
          titulo: "Falhou",
          status: MISSION_STATUS.failed,
          is_pinned: false,
          completed_at: null,
          failed_at: new Date("2026-05-19T12:00:00.000Z"),
        }),
        mission({
          missao_id: 12,
          titulo: "Pendente",
          status: MISSION_STATUS.pending,
          is_pinned: false,
          completed_at: null,
          prazo: new Date("2026-05-20T00:00:00.000Z"),
        }),
      ]),
      listForReview: jest.fn().mockResolvedValue([]),
      listHistorical: jest.fn().mockResolvedValue([mission()]),
    }
    const prisma = {
      auditoria_eventos: { create: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([]),
      revisoes_semanais: {
        create: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
    }
    const reviews = new ReviewsService(prisma as never, missions as never, new OperationalCalendarService())
    jest.useFakeTimers().setSystemTime(new Date("2026-05-25T12:00:00.000Z"))

    const state = await reviews.reviewState(user())
    const report = await reviews.weeklyReport(user(), "2026-05-18", "2026-05-24")
    const support = await reviews.generalSupport(user())

    expect(state.pending).toBe(true)
    expect(state.reading.pending_missions).toBe(1)
    expect(report).toMatchObject({
      total_missions: 2,
      completed_missions: 1,
      failed_missions: 1,
      high_priority_missions: 1,
    })
    expect(support.review_state.pending).toBe(true)
    expect(support.historical_missions[0]).toMatchObject({ id: 10 })
    jest.useRealTimers()
  })
})
