import { INestApplication } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import { Prisma } from "@prisma/client"
import request = require("supertest")

import { AppModule } from "../src/app.module"
import { MISSION_STATUS } from "../src/missions/mission.types"
import { PrismaService } from "../src/prisma/prisma.service"

type UserRow = {
  usuario_id: number
  usuario: string
  email: string
  senha_hash: string
  ativo: boolean
  nome_general: string | null
  active_mode: string
  timezone: string
  created_at: Date
  updated_at: Date
}

type MissionRow = {
  missao_id: number
  titulo: string
  prioridade: number
  prazo: Date | null
  instrucao: string | null
  status: string
  is_pinned: boolean
  created_at: Date
  updated_at: Date
  completed_at: Date | null
  failed_at: Date | null
  recurrence_weekdays: number[]
  recurrence_end_date: Date | null
  duration_type: string | null
  recurrence_key: string | null
  criada_por_id: number
  responsavel_id: number
  objetivo_id: number | null
  sonho_id: number | null
}

type DreamRow = {
  id: number
  usuario_id: number
  titulo: string
  descricao: string | null
  tipo: string
  status: string
  justificativa_arquivamento: string | null
  created_at: Date
  updated_at: Date
  archived_at: Date | null
  concluded_at: Date | null
}

type GoalRow = {
  id: number
  usuario_id: number
  sonho_id: number | null
  titulo: string
  descricao: string | null
  data_alvo: Date | null
  progresso: number
  status: string
  created_at: Date
  updated_at: Date
  concluded_at: Date | null
  order_index: number
}

type ReviewRow = {
  revisao_id: number
  usuario_id: number
  start_date: Date
  end_date: Date
  reviewed_at: Date
  resumo_operacional: string
  completed_missions: number
  pending_missions: number
  failed_missions: number
  high_priority_missions: number
  observacao: string | null
}

class InMemoryPrisma {
  private userId = 1
  private missionId = 1
  private eventId = 1
  private dreamId = 1
  private goalId = 1
  private reviewId = 1
  readonly users: UserRow[] = []
  readonly missions: MissionRow[] = []
  readonly dreams: DreamRow[] = []
  readonly goals: GoalRow[] = []
  readonly reviews: ReviewRow[] = []
  readonly events: Array<{ evento_id: number; missao_id: number | null; usuario_id: number | null; acao: string; detalhes: string; criado_em: Date }> = []

  readonly usuarios = {
    create: async ({ data }: { data: Pick<UserRow, "usuario" | "email" | "senha_hash"> }) => {
      const now = new Date()
      const user: UserRow = {
        usuario_id: this.userId++,
        usuario: data.usuario,
        email: data.email,
        senha_hash: data.senha_hash,
        ativo: true,
        nome_general: null,
        active_mode: "general",
        timezone: "America/Recife",
        created_at: now,
        updated_at: now,
      }
      this.users.push(user)
      return user
    },
    findUnique: async ({ where }: { where: Partial<Pick<UserRow, "usuario_id" | "usuario" | "email">> }) =>
      this.users.find(
        (user) =>
          (where.usuario_id !== undefined && user.usuario_id === where.usuario_id) ||
          (where.usuario !== undefined && user.usuario === where.usuario) ||
          (where.email !== undefined && user.email === where.email),
      ) ?? null,
    update: async ({ where, data }: { where: { usuario_id: number }; data: Partial<UserRow> }) => {
      const user = this.users.find((item) => item.usuario_id === where.usuario_id)
      if (!user) {
        throw new Error("User not found")
      }
      Object.assign(user, data, { updated_at: new Date() })
      return user
    },
  }

  readonly missoes = {
    create: async ({ data }: { data: Partial<MissionRow> & Pick<MissionRow, "titulo" | "status" | "criada_por_id" | "responsavel_id"> }) => {
      if (data.recurrence_key && this.missions.some((mission) => mission.recurrence_key === data.recurrence_key)) {
        throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed on recurrence_key", {
          clientVersion: "test",
          code: "P2002",
          meta: { target: ["recurrence_key"] },
        })
      }
      const now = new Date()
      const mission: MissionRow = {
        missao_id: this.missionId++,
        titulo: data.titulo,
        prioridade: data.prioridade ?? 2,
        prazo: data.prazo ?? null,
        instrucao: data.instrucao ?? null,
        status: data.status,
        is_pinned: data.is_pinned ?? false,
        created_at: now,
        updated_at: now,
        completed_at: data.completed_at ?? null,
        failed_at: data.failed_at ?? null,
        recurrence_weekdays: data.recurrence_weekdays ?? [],
        recurrence_end_date: data.recurrence_end_date ?? null,
        duration_type: data.duration_type ?? null,
        recurrence_key: data.recurrence_key ?? null,
        criada_por_id: data.criada_por_id,
        responsavel_id: data.responsavel_id,
        objetivo_id: data.objetivo_id ?? null,
        sonho_id: data.sonho_id ?? null,
      }
      this.missions.push(mission)
      return mission
    },
    findMany: async ({ where }: { where?: { responsavel_id?: number; status?: string; prazo?: { lt: Date } } } = {}) => {
      let missions = [...this.missions]
      if (where?.responsavel_id !== undefined) {
        missions = missions.filter((mission) => mission.responsavel_id === where.responsavel_id)
      }
      if (where?.status !== undefined) {
        missions = missions.filter((mission) => mission.status === where.status)
      }
      if (where?.prazo?.lt) {
        missions = missions.filter((mission) => mission.prazo !== null && mission.prazo < where.prazo!.lt)
      }
      return missions
    },
    findFirst: async ({ where }: { where: { missao_id?: number; responsavel_id?: number } }) =>
      this.missions.find(
        (mission) =>
          (where.missao_id === undefined || mission.missao_id === where.missao_id) &&
          (where.responsavel_id === undefined || mission.responsavel_id === where.responsavel_id),
      ) ?? null,
    findUnique: async ({ where }: { where: { missao_id?: number; recurrence_key?: string | null } }) =>
      this.missions.find(
        (mission) =>
          (where.missao_id !== undefined && mission.missao_id === where.missao_id) ||
          (where.recurrence_key !== undefined && mission.recurrence_key === where.recurrence_key),
      ) ?? null,
    update: async ({ where, data }: { where: { missao_id: number }; data: Partial<MissionRow> }) => {
      const mission = this.missions.find((item) => item.missao_id === where.missao_id)
      if (!mission) {
        throw new Error("Mission not found")
      }
      Object.assign(mission, data, { updated_at: new Date() })
      return mission
    },
    delete: async ({ where }: { where: { missao_id: number } }) => {
      const index = this.missions.findIndex((mission) => mission.missao_id === where.missao_id)
      if (index >= 0) {
        this.missions.splice(index, 1)
      }
    },
  }

  readonly auditoria_eventos = {
    create: async ({ data }: { data: { missao_id: number | null; usuario_id: number | null; acao: string; detalhes: string } }) => {
      const event = { evento_id: this.eventId++, criado_em: new Date(), ...data }
      this.events.push(event)
      return event
    },
    deleteMany: async ({ where }: { where: { missao_id: number } }) => {
      for (let index = this.events.length - 1; index >= 0; index -= 1) {
        if (this.events[index].missao_id === where.missao_id) {
          this.events.splice(index, 1)
        }
      }
    },
    findMany: async ({ where }: { where: { missao_id: number } }) => this.events.filter((event) => event.missao_id === where.missao_id),
  }

  readonly objetivos = {
    aggregate: async ({ where }: { where: { usuario_id: number; sonho_id: number | null } }) => {
      const orderIndexes = this.goals
        .filter((goal) => goal.usuario_id === where.usuario_id && goal.sonho_id === where.sonho_id)
        .map((goal) => goal.order_index)
      return { _max: { order_index: orderIndexes.length ? Math.max(...orderIndexes) : null } }
    },
    create: async ({ data }: { data: Partial<GoalRow> & Pick<GoalRow, "usuario_id" | "titulo" | "status"> }) => {
      const now = new Date()
      const goal: GoalRow = {
        id: this.goalId++,
        usuario_id: data.usuario_id,
        sonho_id: data.sonho_id ?? null,
        titulo: data.titulo,
        descricao: data.descricao ?? null,
        data_alvo: data.data_alvo ?? null,
        progresso: data.progresso ?? 0,
        status: data.status,
        created_at: data.created_at ?? now,
        updated_at: data.updated_at ?? now,
        concluded_at: data.concluded_at ?? null,
        order_index: data.order_index ?? 1,
      }
      this.goals.push(goal)
      return goal
    },
    findFirst: async ({ where, include }: { where: { id?: number; usuario_id?: number }; include?: { sonhos?: boolean } }) => {
      const goal =
        this.goals.find(
          (item) =>
            (where.id === undefined || item.id === where.id) &&
            (where.usuario_id === undefined || item.usuario_id === where.usuario_id),
        ) ?? null
      if (!goal) {
        return null
      }
      return include?.sonhos ? { ...goal, sonhos: this.dreams.find((dream) => dream.id === goal.sonho_id) ?? null } : goal
    },
    findMany: async ({ where }: { where?: { usuario_id?: number; id?: { in: number[] } } } = {}) => {
      let goals = [...this.goals]
      if (where?.usuario_id !== undefined) {
        goals = goals.filter((goal) => goal.usuario_id === where.usuario_id)
      }
      if (where?.id?.in) {
        goals = goals.filter((goal) => where.id!.in.includes(goal.id))
      }
      return goals
    },
    update: async ({ where, data }: { where: { id: number }; data: Partial<GoalRow> }) => {
      const goal = this.goals.find((item) => item.id === where.id)
      if (!goal) {
        throw new Error("Goal not found")
      }
      Object.assign(goal, data, { updated_at: new Date() })
      return goal
    },
  }

  readonly sonhos = {
    count: async ({ where }: { where: Partial<Pick<DreamRow, "usuario_id" | "status" | "tipo">> }) =>
      this.dreams.filter(
        (dream) =>
          (where.usuario_id === undefined || dream.usuario_id === where.usuario_id) &&
          (where.status === undefined || dream.status === where.status) &&
          (where.tipo === undefined || dream.tipo === where.tipo),
      ).length,
    create: async ({ data }: { data: Partial<DreamRow> & Pick<DreamRow, "usuario_id" | "titulo" | "tipo" | "status"> }) => {
      const now = new Date()
      const dream: DreamRow = {
        id: this.dreamId++,
        usuario_id: data.usuario_id,
        titulo: data.titulo,
        descricao: data.descricao ?? null,
        tipo: data.tipo,
        status: data.status,
        justificativa_arquivamento: data.justificativa_arquivamento ?? null,
        created_at: data.created_at ?? now,
        updated_at: data.updated_at ?? now,
        archived_at: data.archived_at ?? null,
        concluded_at: data.concluded_at ?? null,
      }
      this.dreams.push(dream)
      return dream
    },
    findFirst: async ({ where }: { where: { id?: number; usuario_id?: number; status?: string } }) =>
      this.dreams.find(
        (dream) =>
          (where.id === undefined || dream.id === where.id) &&
          (where.usuario_id === undefined || dream.usuario_id === where.usuario_id) &&
          (where.status === undefined || dream.status === where.status),
      ) ?? null,
    findMany: async ({ where }: { where?: { usuario_id?: number } } = {}) =>
      this.dreams.filter((dream) => where?.usuario_id === undefined || dream.usuario_id === where.usuario_id),
    updateMany: async ({ where, data }: { where: Partial<DreamRow>; data: Partial<DreamRow> }) => {
      this.dreams
        .filter(
          (dream) =>
            (where.usuario_id === undefined || dream.usuario_id === where.usuario_id) &&
            (where.status === undefined || dream.status === where.status) &&
            (where.tipo === undefined || dream.tipo === where.tipo),
        )
        .forEach((dream) => Object.assign(dream, data))
    },
    update: async ({ where, data }: { where: { id: number }; data: Partial<DreamRow> }) => {
      const dream = this.dreams.find((item) => item.id === where.id)
      if (!dream) {
        throw new Error("Dream not found")
      }
      Object.assign(dream, data, { updated_at: new Date() })
      return dream
    },
  }

  readonly revisoes_semanais = {
    create: async ({ data }: { data: Omit<ReviewRow, "revisao_id"> }) => {
      const review = { revisao_id: this.reviewId++, ...data }
      this.reviews.push(review)
      return review
    },
    findFirst: async ({ where }: { where: { usuario_id: number; start_date?: Date; end_date?: Date } }) =>
      this.reviews.find(
        (review) =>
          review.usuario_id === where.usuario_id &&
          (where.start_date === undefined || review.start_date.getTime() === where.start_date.getTime()) &&
          (where.end_date === undefined || review.end_date.getTime() === where.end_date.getTime()),
      ) ?? null,
    findMany: async ({ where }: { where: { usuario_id: number } }) =>
      this.reviews.filter((review) => review.usuario_id === where.usuario_id),
  }

  async $transaction<T>(operation: Promise<T>[] | ((tx: this) => Promise<T>)): Promise<T | T[]> {
    if (Array.isArray(operation)) {
      return Promise.all(operation)
    }
    return operation(this)
  }

  async $queryRaw(): Promise<Array<{ "?column?": number }>> {
    return [{ "?column?": 1 }]
  }

  async $disconnect(): Promise<void> {}
}

describe("HTTP application", () => {
  let app: INestApplication

  beforeAll(async () => {
    process.env.BUNKERMODE_AUTH_SECRET = "http-test-secret"
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(new InMemoryPrisma())
      .compile()

    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it("responds to health checks", async () => {
    await request(app.getHttpServer()).get("/health").expect(200).expect({ status: "ok" })
    await request(app.getHttpServer()).get("/api/v2/health").expect(200).expect({ status: "ok" })
  })

  it("rejects protected endpoints without token", async () => {
    await request(app.getHttpServer()).get("/api/v2/usuarios/me").expect(401)
  })

  it("returns the domain error contract for invalid payloads", async () => {
    const response = await request(app.getHttpServer()).post("/api/v2/auth/register").send({ usuario: "x" }).expect(400)

    expect(response.body).toMatchObject({ message: "Usuário deve ter pelo menos 3 caracteres." })
  })

  it("registers, logs in, reads the authenticated user and executes a mission flow", async () => {
    await request(app.getHttpServer())
      .post("/api/v2/auth/register")
      .send({ usuario: "general", email: "general@bunker.local", senha: "senha1234" })
      .expect(201)

    const login = await request(app.getHttpServer())
      .post("/api/v2/auth/login")
      .send({ email: "general", senha: "senha1234" })
      .expect(200)
    const token = login.body.access_token

    await request(app.getHttpServer())
      .get("/api/v2/usuarios/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.usuario).toBe("general")
      })

    const created = await request(app.getHttpServer())
      .post("/api/v2/missoes")
      .set("Authorization", `Bearer ${token}`)
      .send({ titulo: "Executar ordem", prazo: "2026-08-13" })
      .expect(201)
    expect(created.body).toMatchObject({ titulo: "Executar ordem", status: MISSION_STATUS.pending })

    await request(app.getHttpServer())
      .get("/api/v2/missoes")
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toHaveLength(1)
      })

    await request(app.getHttpServer())
      .patch(`/api/v2/missoes/${created.body.id}/concluir`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe(MISSION_STATUS.completed)
      })

    await request(app.getHttpServer())
      .get(`/api/v2/missoes/${created.body.id}/historico`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.map((event: { acao: string }) => event.acao)).toEqual(["missao_criada", "missao_concluida"])
      })
  })

  it("validates the representative clean product flow over HTTP", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-13T12:00:00.000Z"))
    try {
      await request(app.getHttpServer())
        .post("/api/v2/auth/register")
        .send({ usuario: "comandante", email: "comandante@bunker.local", senha: "senha1234" })
        .expect(201)

      const login = await request(app.getHttpServer())
        .post("/api/v2/auth/login")
        .send({ email: "comandante", senha: "senha1234" })
        .expect(200)
      const token = login.body.access_token

      const sonho = await request(app.getHttpServer())
        .post("/api/v2/sonhos")
        .set("Authorization", `Bearer ${token}`)
        .send({ titulo: "Campanha principal", tipo: "principal" })
        .expect(201)

      const objetivo = await request(app.getHttpServer())
        .post("/api/v2/objetivos")
        .set("Authorization", `Bearer ${token}`)
        .send({ titulo: "Tomar posição", sonho_id: sonho.body.id, progresso: 10 })
        .expect(201)

      const recurring = await request(app.getHttpServer())
        .post("/api/v2/missoes")
        .set("Authorization", `Bearer ${token}`)
        .send({
          titulo: "Treinar execução",
          prazo: "2026-08-13",
          objetivo_id: objetivo.body.id,
          recurrence_weekdays: [3],
          duration_type: "ate_objetivo",
        })
        .expect(201)

      const firstMountain = await request(app.getHttpServer())
        .get("/api/v2/montanha")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
      const firstRecurringCount = firstMountain.body.missions.filter((mission: { titulo: string }) => mission.titulo === "Treinar execução").length

      await request(app.getHttpServer())
        .patch("/api/v2/session/mode")
        .set("Authorization", `Bearer ${token}`)
        .send({ mode: "soldier" })
        .expect(200)

      await request(app.getHttpServer())
        .get("/api/v2/missoes/quadro-soldado")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
        .expect((response) => {
          expect(response.body.missions.map((mission: { id: number }) => mission.id)).toContain(recurring.body.id)
        })

      await request(app.getHttpServer())
        .patch(`/api/v2/missoes/${recurring.body.id}/concluir`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
        .expect((response) => {
          expect(response.body.status).toBe(MISSION_STATUS.completed)
        })

      await request(app.getHttpServer())
        .patch("/api/v2/session/mode")
        .set("Authorization", `Bearer ${token}`)
        .send({ mode: "general" })
        .expect(200)

      const failed = await request(app.getHttpServer())
        .post("/api/v2/missoes")
        .set("Authorization", `Bearer ${token}`)
        .send({ titulo: "Registrar falha", prazo: "2026-08-13" })
        .expect(201)

      await request(app.getHttpServer())
        .post(`/api/v2/missoes/${failed.body.id}/falhar`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
        .expect((response) => {
          expect(response.body.status).toBe(MISSION_STATUS.failed)
        })

      await request(app.getHttpServer())
        .get("/api/v2/relatorios/semanal?start_date=2026-08-13&end_date=2026-08-13")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
        .expect((response) => {
          expect(response.body.completed_missions).toBe(1)
          expect(response.body.failed_missions).toBe(1)
        })

      await request(app.getHttpServer())
        .get("/api/v2/comando-general/suporte")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
        .expect((response) => {
          expect(response.body.historical_missions.map((mission: { status: string }) => mission.status).sort()).toEqual([
            MISSION_STATUS.completed,
            MISSION_STATUS.failed,
          ])
        })

      const secondMountain = await request(app.getHttpServer())
        .get("/api/v2/montanha")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
      const secondRecurringCount = secondMountain.body.missions.filter((mission: { titulo: string }) => mission.titulo === "Treinar execução").length
      expect(secondRecurringCount).toBe(firstRecurringCount)
    } finally {
      jest.useRealTimers()
    }
  })
})
