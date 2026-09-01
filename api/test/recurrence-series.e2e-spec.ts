import { Prisma } from "@prisma/client";

import { PrismaService } from "../src/prisma/prisma.service";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = testDatabaseUrl ? describe : describe.skip;
const originalDatabaseUrl = process.env.DATABASE_URL;

describeWithDatabase("Recurrence series persistence", () => {
  let prisma: PrismaService;
  let userId: number;

  beforeAll(() => {
    process.env.DATABASE_URL = testDatabaseUrl;
    prisma = new PrismaService();
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  beforeEach(async () => {
    const suffix = `${Date.now()}-${Math.random()}`;
    const user = await prisma.usuarios.create({
      data: {
        usuario: `recurrence-${suffix}`,
        email: `recurrence-${suffix}@bunker.local`,
        senha_hash: "hash",
      },
    });
    userId = user.usuario_id;
  });

  afterEach(async () => {
    await prisma.usuarios.delete({ where: { usuario_id: userId } });
  });

  function createSeries(
    overrides: Partial<Prisma.series_recorrenciaUncheckedCreateInput> = {},
  ) {
    return prisma.series_recorrencia.create({
      data: {
        responsavel_id: userId,
        titulo: "Treinar execução",
        prioridade: 2,
        recurrence_weekdays: [0, 2, 4],
        start_date: new Date("2026-09-01T00:00:00.000Z"),
        termination_policy: "sem_termino",
        ...overrides,
      },
    });
  }

  function createMission(recurrenceSeriesId: number | null, title: string) {
    return prisma.missoes.create({
      data: {
        titulo: title,
        prazo: new Date("2026-09-02T00:00:00.000Z"),
        criada_por_id: userId,
        responsavel_id: userId,
        recurrence_series_id: recurrenceSeriesId,
      },
    });
  }

  it("creates a recurrence series without an objective", async () => {
    const series = await createSeries();

    expect(series).toMatchObject({
      responsavel_id: userId,
      objetivo_id: null,
      termination_policy: "sem_termino",
      ativo: true,
    });
  });

  it("creates an until-objective series linked to an owned objective", async () => {
    const objective = await prisma.objetivos.create({
      data: {
        usuario_id: userId,
        titulo: "Concluir fundação",
      },
    });

    const series = await createSeries({
      objetivo_id: objective.id,
      termination_policy: "ate_objetivo",
    });

    expect(series.objetivo_id).toBe(objective.id);
  });

  it("preserves the series when its objective is deleted", async () => {
    const objective = await prisma.objetivos.create({
      data: {
        usuario_id: userId,
        titulo: "Objetivo removível",
      },
    });
    const series = await createSeries({ objetivo_id: objective.id });

    await prisma.objetivos.delete({ where: { id: objective.id } });

    await expect(
      prisma.series_recorrencia.findUniqueOrThrow({
        where: { recurrence_series_id: series.recurrence_series_id },
      }),
    ).resolves.toMatchObject({ objetivo_id: null });
  });

  it("rejects an until-date series without an end date", async () => {
    await expect(
      createSeries({ termination_policy: "ate_data" }),
    ).rejects.toBeDefined();
  });

  it("rejects weekdays outside the Monday-to-Sunday range", async () => {
    await expect(
      createSeries({ recurrence_weekdays: [0, 7] }),
    ).rejects.toBeDefined();
  });

  it("rejects an end date before the start date", async () => {
    await expect(
      createSeries({
        termination_policy: "ate_data",
        end_date: new Date("2026-08-31T00:00:00.000Z"),
      }),
    ).rejects.toBeDefined();
  });

  it("rejects two occurrences from the same series on the same date", async () => {
    const series = await createSeries();
    await createMission(series.recurrence_series_id, "Primeira ocorrência");

    await expect(
      createMission(series.recurrence_series_id, "Ocorrência duplicada"),
    ).rejects.toBeDefined();
  });

  it("allows two one-time missions on the same date", async () => {
    await createMission(null, "Ordem pontual A");
    await createMission(null, "Ordem pontual B");

    await expect(
      prisma.missoes.count({
        where: { responsavel_id: userId, recurrence_series_id: null },
      }),
    ).resolves.toBe(2);
  });

  it("allows different series to generate occurrences on the same date", async () => {
    const firstSeries = await createSeries({ titulo: "Série A" });
    const secondSeries = await createSeries({ titulo: "Série B" });

    await createMission(firstSeries.recurrence_series_id, "Ocorrência A");
    await createMission(secondSeries.recurrence_series_id, "Ocorrência B");

    await expect(
      prisma.missoes.count({
        where: { responsavel_id: userId, recurrence_series_id: { not: null } },
      }),
    ).resolves.toBe(2);
  });
});
