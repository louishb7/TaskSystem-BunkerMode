import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request = require("supertest");

import { AppModule } from "../src/app.module";
import { MISSION_STATUS } from "../src/missions/mission.types";
import { PrismaService } from "../src/prisma/prisma.service";

type UserRow = {
  usuario_id: number;
  usuario: string;
  email: string;
  senha_hash: string;
  ativo: boolean;
  nome_general: string | null;
  active_mode: string;
  timezone: string;
  created_at: Date;
  updated_at: Date;
};

type MissionRow = {
  missao_id: number;
  titulo: string;
  prioridade: number;
  prazo: Date | null;
  instrucao: string | null;
  status: string;
  is_pinned: boolean;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
  failed_at: Date | null;
  recurrence_series_id: number | null;
  criada_por_id: number;
  responsavel_id: number;
  objetivo_id: number | null;
};

type RecurrenceSeriesRow = {
  recurrence_series_id: number;
  responsavel_id: number;
  objetivo_id: number | null;
  titulo: string;
  instrucao: string | null;
  prioridade: number;
  recurrence_weekdays: number[];
  start_date: Date;
  termination_policy: string;
  end_date: Date | null;
  ativo: boolean;
  created_at: Date;
  updated_at: Date;
};

type GoalRow = {
  id: number;
  usuario_id: number;
  titulo: string;
  descricao: string | null;
  data_alvo: Date | null;
  status: string;
  created_at: Date;
  updated_at: Date;
  concluded_at: Date | null;
  order_index: number;
};

class InMemoryPrisma {
  private userId = 1;
  private missionId = 1;
  private eventId = 1;
  private goalId = 1;
  private recurrenceSeriesId = 1;
  readonly users: UserRow[] = [];
  readonly missions: MissionRow[] = [];
  readonly goals: GoalRow[] = [];
  readonly recurrenceSeries: RecurrenceSeriesRow[] = [];
  readonly events: Array<{
    evento_id: number;
    missao_id: number | null;
    usuario_id: number | null;
    acao: string;
    detalhes: string;
    criado_em: Date;
  }> = [];

  readonly usuarios = {
    create: async ({
      data,
    }: {
      data: Pick<UserRow, "usuario" | "email" | "senha_hash">;
    }) => {
      const now = new Date();
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
      };
      this.users.push(user);
      return user;
    },
    findUnique: async ({
      where,
    }: {
      where: Partial<Pick<UserRow, "usuario_id" | "usuario" | "email">>;
    }) =>
      this.users.find(
        (user) =>
          (where.usuario_id !== undefined &&
            user.usuario_id === where.usuario_id) ||
          (where.usuario !== undefined && user.usuario === where.usuario) ||
          (where.email !== undefined && user.email === where.email),
      ) ?? null,
    update: async ({
      where,
      data,
    }: {
      where: { usuario_id: number };
      data: Partial<UserRow>;
    }) => {
      const user = this.users.find(
        (item) => item.usuario_id === where.usuario_id,
      );
      if (!user) {
        throw new Error("User not found");
      }
      Object.assign(user, data, { updated_at: new Date() });
      return user;
    },
  };

  readonly missoes = {
    create: async ({
      data,
    }: {
      data: Partial<MissionRow> &
        Pick<
          MissionRow,
          "titulo" | "status" | "criada_por_id" | "responsavel_id"
        >;
    }) => {
      const now = new Date();
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
        recurrence_series_id: data.recurrence_series_id ?? null,
        criada_por_id: data.criada_por_id,
        responsavel_id: data.responsavel_id,
        objetivo_id: data.objetivo_id ?? null,
      };
      this.missions.push(mission);
      return mission;
    },
    createManyAndReturn: async ({
      data,
      skipDuplicates,
    }: {
      data: Array<
        Partial<MissionRow> &
          Pick<
            MissionRow,
            "titulo" | "status" | "criada_por_id" | "responsavel_id"
          >
      >;
      skipDuplicates?: boolean;
    }) => {
      const created: MissionRow[] = [];
      for (const item of data) {
        const duplicate = this.missions.some(
          (mission) =>
            item.recurrence_series_id !== null &&
            item.recurrence_series_id !== undefined &&
            mission.recurrence_series_id === item.recurrence_series_id &&
            mission.prazo?.getTime() === item.prazo?.getTime(),
        );
        if (duplicate && skipDuplicates) {
          continue;
        }
        created.push(await this.missoes.create({ data: item }));
      }
      return created;
    },
    findMany: async ({
      where,
      include,
    }: {
      where?: {
        responsavel_id?: number;
        status?: string;
        prazo?: { lt: Date };
      };
      include?: { serie_recorrencia?: boolean };
    } = {}) => {
      let missions = [...this.missions];
      if (where?.responsavel_id !== undefined) {
        missions = missions.filter(
          (mission) => mission.responsavel_id === where.responsavel_id,
        );
      }
      if (where?.status !== undefined) {
        missions = missions.filter(
          (mission) => mission.status === where.status,
        );
      }
      if (where?.prazo?.lt) {
        missions = missions.filter(
          (mission) =>
            mission.prazo !== null && mission.prazo < where.prazo!.lt,
        );
      }
      return missions.map((mission) =>
        include?.serie_recorrencia
          ? {
              ...mission,
              serie_recorrencia:
                this.recurrenceSeries.find(
                  (series) =>
                    series.recurrence_series_id ===
                    mission.recurrence_series_id,
                ) ?? null,
            }
          : mission,
      );
    },
    findFirst: async ({
      where,
    }: {
      where: { missao_id?: number; responsavel_id?: number };
    }) =>
      this.missions.find(
        (mission) =>
          (where.missao_id === undefined ||
            mission.missao_id === where.missao_id) &&
          (where.responsavel_id === undefined ||
            mission.responsavel_id === where.responsavel_id),
      ) ?? null,
    findUnique: async ({ where }: { where: { missao_id?: number } }) =>
      this.missions.find(
        (mission) =>
          where.missao_id !== undefined &&
          mission.missao_id === where.missao_id,
      ) ?? null,
    update: async ({
      where,
      data,
    }: {
      where: { missao_id: number };
      data: Partial<MissionRow>;
    }) => {
      const mission = this.missions.find(
        (item) => item.missao_id === where.missao_id,
      );
      if (!mission) {
        throw new Error("Mission not found");
      }
      Object.assign(mission, data, { updated_at: new Date() });
      return mission;
    },
    delete: async ({ where }: { where: { missao_id: number } }) => {
      const index = this.missions.findIndex(
        (mission) => mission.missao_id === where.missao_id,
      );
      if (index >= 0) {
        this.missions.splice(index, 1);
      }
    },
  };

  readonly auditoria_eventos = {
    create: async ({
      data,
    }: {
      data: {
        missao_id: number | null;
        usuario_id: number | null;
        acao: string;
        detalhes: string;
      };
    }) => {
      const event = {
        evento_id: this.eventId++,
        criado_em: new Date(),
        ...data,
      };
      this.events.push(event);
      return event;
    },
    createMany: async ({
      data,
    }: {
      data: Array<{
        missao_id: number | null;
        usuario_id: number | null;
        acao: string;
        detalhes: string;
      }>;
    }) => {
      for (const item of data) {
        await this.auditoria_eventos.create({ data: item });
      }
      return { count: data.length };
    },
    deleteMany: async ({ where }: { where: { missao_id: number } }) => {
      for (let index = this.events.length - 1; index >= 0; index -= 1) {
        if (this.events[index].missao_id === where.missao_id) {
          this.events.splice(index, 1);
        }
      }
    },
    findMany: async ({ where }: { where: { missao_id: number } }) =>
      this.events.filter((event) => event.missao_id === where.missao_id),
  };

  readonly series_recorrencia = {
    create: async ({
      data,
    }: {
      data: Omit<
        RecurrenceSeriesRow,
        "recurrence_series_id" | "created_at" | "updated_at"
      >;
    }) => {
      const now = new Date();
      const series: RecurrenceSeriesRow = {
        recurrence_series_id: this.recurrenceSeriesId++,
        created_at: now,
        updated_at: now,
        ...data,
      };
      this.recurrenceSeries.push(series);
      return series;
    },
    findMany: async ({
      where,
      include,
    }: {
      where: { responsavel_id: number; ativo: boolean };
      include?: { objetivos?: boolean };
    }) =>
      this.recurrenceSeries
        .filter(
          (series) =>
            series.responsavel_id === where.responsavel_id &&
            series.ativo === where.ativo,
        )
        .map((series) =>
          include?.objetivos
            ? {
                ...series,
                objetivos:
                  this.goals.find((goal) => goal.id === series.objetivo_id) ??
                  null,
              }
            : series,
        ),
    updateMany: async ({
      where,
      data,
    }: {
      where: Partial<RecurrenceSeriesRow>;
      data: Partial<RecurrenceSeriesRow>;
    }) => {
      const matching = this.recurrenceSeries.filter(
        (series) =>
          (where.recurrence_series_id === undefined ||
            series.recurrence_series_id === where.recurrence_series_id) &&
          (where.objetivo_id === undefined ||
            series.objetivo_id === where.objetivo_id) &&
          (where.termination_policy === undefined ||
            series.termination_policy === where.termination_policy) &&
          (where.ativo === undefined || series.ativo === where.ativo),
      );
      matching.forEach((series) =>
        Object.assign(series, data, { updated_at: new Date() }),
      );
      return { count: matching.length };
    },
  };

  readonly objetivos = {
    delete: async ({ where }: { where: { id: number } }) => {
      const index = this.goals.findIndex((goal) => goal.id === where.id);
      if (index < 0) throw new Error("Goal not found");
      this.goals.splice(index, 1);
      this.missions
        .filter((mission) => mission.objetivo_id === where.id)
        .forEach((mission) => {
          mission.objetivo_id = null;
        });
      this.recurrenceSeries
        .filter((series) => series.objetivo_id === where.id)
        .forEach((series) => {
          series.objetivo_id = null;
        });
    },
    aggregate: async ({ where }: { where: { usuario_id: number } }) => {
      const orderIndexes = this.goals
        .filter((goal) => goal.usuario_id === where.usuario_id)
        .map((goal) => goal.order_index);
      return {
        _max: {
          order_index: orderIndexes.length ? Math.max(...orderIndexes) : null,
        },
      };
    },
    create: async ({
      data,
    }: {
      data: Partial<GoalRow> &
        Pick<GoalRow, "usuario_id" | "titulo" | "status">;
    }) => {
      const now = new Date();
      const goal: GoalRow = {
        id: this.goalId++,
        usuario_id: data.usuario_id,
        titulo: data.titulo,
        descricao: data.descricao ?? null,
        data_alvo: data.data_alvo ?? null,
        status: data.status,
        created_at: data.created_at ?? now,
        updated_at: data.updated_at ?? now,
        concluded_at: data.concluded_at ?? null,
        order_index: data.order_index ?? 1,
      };
      this.goals.push(goal);
      return goal;
    },
    findFirst: async ({
      where,
    }: {
      where: { id?: number; usuario_id?: number; status?: string };
    }) => {
      const goal =
        this.goals.find(
          (item) =>
            (where.id === undefined || item.id === where.id) &&
            (where.usuario_id === undefined ||
              item.usuario_id === where.usuario_id) &&
            (where.status === undefined || item.status === where.status),
        ) ?? null;
      if (!goal) {
        return null;
      }
      return goal;
    },
    findMany: async ({
      where,
    }: { where?: { usuario_id?: number; id?: { in: number[] } } } = {}) => {
      let goals = [...this.goals];
      if (where?.usuario_id !== undefined) {
        goals = goals.filter((goal) => goal.usuario_id === where.usuario_id);
      }
      if (where?.id?.in) {
        goals = goals.filter((goal) => where.id!.in.includes(goal.id));
      }
      return goals.sort(
        (left, right) =>
          left.order_index - right.order_index || left.id - right.id,
      );
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: number };
      data: Partial<GoalRow>;
    }) => {
      const goal = this.goals.find((item) => item.id === where.id);
      if (!goal) {
        throw new Error("Goal not found");
      }
      Object.assign(goal, data, { updated_at: new Date() });
      return goal;
    },
  };

  async $transaction<T>(
    operation: Promise<T>[] | ((tx: this) => Promise<T>),
  ): Promise<T | T[]> {
    if (Array.isArray(operation)) {
      return Promise.all(operation);
    }
    return operation(this);
  }

  async $queryRaw(): Promise<Array<{ "?column?": number }>> {
    return [{ "?column?": 1 }];
  }

  async $disconnect(): Promise<void> {}
}

describe("HTTP application", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.BUNKERMODE_AUTH_SECRET = "http-test-secret";
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(new InMemoryPrisma())
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("responds to health checks", async () => {
    await request(app.getHttpServer())
      .get("/health")
      .expect(200)
      .expect({ status: "ok" });
    await request(app.getHttpServer())
      .get("/api/v2/health")
      .expect(200)
      .expect({ status: "ok" });
  });

  it("rejects protected endpoints without token", async () => {
    await request(app.getHttpServer()).get("/api/v2/usuarios/me").expect(401);
  });

  it("returns the domain error contract for invalid payloads", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v2/auth/register")
      .send({ usuario: "x" })
      .expect(400);

    expect(response.body).toMatchObject({
      message: "Usuário deve ter pelo menos 3 caracteres.",
    });
  });

  it("registers, logs in, reads the authenticated user and executes a mission flow", async () => {
    await request(app.getHttpServer())
      .post("/api/v2/auth/register")
      .send({
        usuario: "general",
        email: "general@bunker.local",
        senha: "senha1234",
      })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post("/api/v2/auth/login")
      .send({ email: "general", senha: "senha1234" })
      .expect(200);
    const token = login.body.access_token;

    await request(app.getHttpServer())
      .get("/api/v2/usuarios/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.usuario).toBe("general");
      });

    const created = await request(app.getHttpServer())
      .post("/api/v2/missoes")
      .set("Authorization", `Bearer ${token}`)
      .send({ titulo: "Executar ordem", prazo: "2026-08-13" })
      .expect(201);
    expect(created.body).toMatchObject({
      titulo: "Executar ordem",
      status: MISSION_STATUS.pending,
    });

    await request(app.getHttpServer())
      .get("/api/v2/missoes")
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toHaveLength(1);
      });

    await request(app.getHttpServer())
      .patch(`/api/v2/missoes/${created.body.id}/concluir`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe(MISSION_STATUS.completed);
      });

    await request(app.getHttpServer())
      .get(`/api/v2/missoes/${created.body.id}/historico`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect((response) => {
        expect(
          response.body.map((event: { acao: string }) => event.acao),
        ).toEqual(["missao_criada", "missao_concluida"]);
      });
  });

  it("treats active mode as an interface preference across protected resources", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-09-01T12:00:00.000Z"));
    try {
      await request(app.getHttpServer())
        .post("/api/v2/auth/register")
        .send({
          usuario: "preferencia",
          email: "preferencia@bunker.local",
          senha: "senha1234",
        })
        .expect(201);

      const login = await request(app.getHttpServer())
        .post("/api/v2/auth/login")
        .send({ email: "preferencia", senha: "senha1234" })
        .expect(200);
      const token = login.body.access_token;

      const original = await request(app.getHttpServer())
        .post("/api/v2/missoes")
        .set("Authorization", `Bearer ${token}`)
        .send({ titulo: "Ordem original", prazo: "2026-09-01" })
        .expect(201);

      const generalList = await request(app.getHttpServer())
        .get("/api/v2/missoes")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get("/api/v2/missoes/quadro-soldado")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
        .expect((response) => {
          expect(
            response.body.missions.map((mission: { id: number }) => mission.id),
          ).toContain(original.body.id);
        });

      await request(app.getHttpServer())
        .patch("/api/v2/session/mode")
        .set("Authorization", `Bearer ${token}`)
        .send({ mode: "soldier" })
        .expect(200)
        .expect((response) => {
          expect(response.body.active_mode).toBe("soldier");
        });

      const soldierList = await request(app.getHttpServer())
        .get("/api/v2/missoes")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(
        soldierList.body.map((mission: { id: number }) => mission.id),
      ).toEqual(generalList.body.map((mission: { id: number }) => mission.id));
      expect(
        soldierList.body.find(
          (mission: { id: number }) => mission.id === original.body.id,
        ).permissions,
      ).toEqual(
        generalList.body.find(
          (mission: { id: number }) => mission.id === original.body.id,
        ).permissions,
      );

      const createdAsSoldier = await request(app.getHttpServer())
        .post("/api/v2/missoes")
        .set("Authorization", `Bearer ${token}`)
        .send({ titulo: "Criada com preferência Soldado", prazo: "2026-09-01" })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v2/missoes/${createdAsSoldier.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ titulo: "Editada com preferência Soldado" })
        .expect(200)
        .expect((response) => {
          expect(response.body.titulo).toBe("Editada com preferência Soldado");
        });

      const objective = await request(app.getHttpServer())
        .post("/api/v2/objetivos")
        .set("Authorization", `Bearer ${token}`)
        .send({ titulo: "Objetivo criado no Soldado" })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v2/objetivos/${objective.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ titulo: "Objetivo editado no Soldado" })
        .expect(200)
        .expect((response) => {
          expect(response.body.titulo).toBe("Objetivo editado no Soldado");
        });

      await request(app.getHttpServer())
        .post("/api/v2/auth/register")
        .send({
          usuario: "intruso",
          email: "intruso@bunker.local",
          senha: "senha1234",
        })
        .expect(201);
      const foreignLogin = await request(app.getHttpServer())
        .post("/api/v2/auth/login")
        .send({ email: "intruso", senha: "senha1234" })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/v2/missoes/${original.body.id}`)
        .set("Authorization", `Bearer ${foreignLogin.body.access_token}`)
        .send({ titulo: "Tentativa indevida" })
        .expect(404);

      await request(app.getHttpServer())
        .delete(`/api/v2/missoes/${createdAsSoldier.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(204);

      await request(app.getHttpServer())
        .patch("/api/v2/usuarios/me/nome-general")
        .set("Authorization", `Bearer ${token}`)
        .send({ nome_general: "Atena" })
        .expect(200);

      await request(app.getHttpServer())
        .patch("/api/v2/session/mode")
        .set("Authorization", `Bearer ${token}`)
        .send({ mode: "general" })
        .expect(200);

      await request(app.getHttpServer())
        .get("/api/v2/usuarios/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200)
        .expect((response) => {
          expect(response.body).toMatchObject({
            active_mode: "general",
            nome_general: "Atena",
          });
        });
    } finally {
      jest.useRealTimers();
    }
  });

  it("executes independent goals, recurring orders and objective history over HTTP", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-13T12:00:00.000Z"));
    try {
      await request(app.getHttpServer())
        .post("/api/v2/auth/register")
        .send({
          usuario: "planejador",
          email: "planejador@bunker.local",
          senha: "senha1234",
        })
        .expect(201);
      const login = await request(app.getHttpServer())
        .post("/api/v2/auth/login")
        .send({ email: "planejador", senha: "senha1234" })
        .expect(200);
      const token = login.body.access_token;
      const authorization = `Bearer ${token}`;
      const objective = await request(app.getHttpServer())
        .post("/api/v2/objetivos")
        .set("Authorization", authorization)
        .send({ titulo: "Consolidar escrita" })
        .expect(201);
      expect(Object.keys(objective.body).sort()).toEqual(
        [
          "id",
          "usuario_id",
          "titulo",
          "descricao",
          "data_alvo",
          "status",
          "order_index",
          "created_at",
          "updated_at",
          "concluded_at",
        ].sort(),
      );
      expect(objective.body).toMatchObject({
        status: "ativo",
        data_alvo: null,
        order_index: 1,
      });

      const recurring = await request(app.getHttpServer())
        .post("/api/v2/missoes")
        .set("Authorization", authorization)
        .send({
          titulo: "Escrever",
          prazo: "2026-08-13",
          objetivo_id: objective.body.id,
          recurrence_weekdays: [3],
          duration_type: "ate_objetivo",
        })
        .expect(201);
      expect(recurring.body.recurrence).toMatchObject({
        weekdays: [3],
        termination_policy: "ate_objetivo",
      });
      expect(Object.keys(recurring.body).sort()).toEqual(
        [
          "id",
          "titulo",
          "prioridade",
          "prazo",
          "instrucao",
          "status",
          "status_code",
          "status_label",
          "is_pinned",
          "created_at",
          "updated_at",
          "completed_at",
          "failed_at",
          "user_id",
          "criada_por_id",
          "responsavel_id",
          "objetivo_id",
          "recurrence",
          "permissions",
        ].sort(),
      );

      const board = () =>
        request(app.getHttpServer())
          .get("/api/v2/missoes/quadro-soldado")
          .set("Authorization", authorization)
          .expect(200);
      const firstBoard = await board();
      const secondBoard = await board();
      expect(secondBoard.body).toEqual(firstBoard.body);
      expect(
        firstBoard.body.missions.map((mission: { id: number }) => mission.id),
      ).toContain(recurring.body.id);
      expect(firstBoard.body.missions[0].recurrence).toMatchObject({
        series_id: recurring.body.recurrence.series_id,
      });

      await request(app.getHttpServer())
        .patch(`/api/v2/missoes/${recurring.body.id}/concluir`)
        .set("Authorization", authorization)
        .expect(200);
      const failed = await request(app.getHttpServer())
        .post("/api/v2/missoes")
        .set("Authorization", authorization)
        .send({ titulo: "Ordem independente", prazo: "2026-08-13" })
        .expect(201);
      expect(failed.body).toMatchObject({
        objetivo_id: null,
        recurrence: null,
      });
      await request(app.getHttpServer())
        .post(`/api/v2/missoes/${failed.body.id}/falhar`)
        .set("Authorization", authorization)
        .expect(200);
      const history = await request(app.getHttpServer())
        .get("/api/v2/missoes/historico")
        .set("Authorization", authorization)
        .expect(200);
      expect(
        history.body
          .map((mission: { status: string }) => mission.status)
          .sort(),
      ).toEqual(["CONCLUIDA", "FALHA"]);
      const goals = await request(app.getHttpServer())
        .get("/api/v2/objetivos")
        .set("Authorization", authorization)
        .expect(200);
      expect(goals.body[0]).toMatchObject({
        status: "ativo",
        concluded_at: null,
      });
      await request(app.getHttpServer())
        .delete(`/api/v2/objetivos/${objective.body.id}`)
        .set("Authorization", authorization)
        .expect(204);
      const afterDelete = await request(app.getHttpServer())
        .get("/api/v2/missoes/historico")
        .set("Authorization", authorization)
        .expect(200);
      expect(afterDelete.body).toHaveLength(2);
      expect(
        afterDelete.body.every(
          (mission: { objetivo_id: number | null }) =>
            mission.objetivo_id === null,
        ),
      ).toBe(true);
      await request(app.getHttpServer())
        .get(`/api/v2/missoes/${recurring.body.id}/historico`)
        .set("Authorization", authorization)
        .expect(200)
        .expect((response) => {
          expect(
            response.body.map((event: { acao: string }) => event.acao),
          ).toEqual(["missao_recorrente_criada", "missao_concluida"]);
        });
    } finally {
      jest.useRealTimers();
    }
  });
});
