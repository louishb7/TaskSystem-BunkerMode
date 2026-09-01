import { Prisma } from "@prisma/client";

import { UserRecord } from "../src/auth/auth.types";
import { OperationalCalendarService } from "../src/calendar/operational-calendar.service";
import { GoalsService } from "../src/goals/goals.service";
import { MISSION_STATUS } from "../src/missions/mission.types";
import { MissionsService } from "../src/missions/missions.service";
import { PrismaService } from "../src/prisma/prisma.service";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = testDatabaseUrl ? describe : describe.skip;
const originalDatabaseUrl = process.env.DATABASE_URL;

describeWithDatabase("Recurrence series persistence", () => {
  let prisma: PrismaService;
  let userId: number;
  let currentDate: string;
  let currentUser: UserRecord;
  let missionsService: MissionsService;
  let goalsService: GoalsService;

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
    currentUser = user;
    currentDate = "2026-08-31";
    const calendar = new OperationalCalendarService();
    jest.spyOn(calendar, "currentDateFor").mockImplementation(() => currentDate);
    missionsService = new MissionsService(prisma, calendar);
    goalsService = new GoalsService(prisma);
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

  function createRecurringMission(overrides: Record<string, unknown> = {}) {
    return missionsService.create(
      {
        titulo: "Treinar execução",
        prazo: "31-08-2026",
        recurrence_weekdays: [0],
        duration_type: "sem_termino",
        ...overrides,
      },
      currentUser,
    );
  }

  async function createObjective(title = "Objetivo recorrente") {
    return prisma.objetivos.create({
      data: {
        usuario_id: userId,
        titulo: title,
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

  it("creates and materializes a normalized endless recurrence without an objective", async () => {
    const firstOccurrence = await createRecurringMission({
      recurrence_weekdays: [2, 0, 2],
    });

    const series = await prisma.series_recorrencia.findUniqueOrThrow({
      where: { recurrence_series_id: firstOccurrence.recurrence_series_id! },
    });
    const occurrences = await prisma.missoes.findMany({
      where: { recurrence_series_id: series.recurrence_series_id },
      orderBy: { prazo: "asc" },
    });

    expect(series).toMatchObject({
      objetivo_id: null,
      recurrence_weekdays: [0, 2],
      termination_policy: "sem_termino",
    });
    expect(occurrences.length).toBeGreaterThan(1);
    expect(occurrences.every((mission) => mission.recurrence_key === null)).toBe(true);
    expect(occurrences.every((mission) => mission.recurrence_weekdays.length === 0)).toBe(true);
  });

  it("creates an until-objective recurrence with an active owned objective", async () => {
    const objective = await createObjective();

    const firstOccurrence = await createRecurringMission({
      objetivo_id: objective.id,
      duration_type: "ate_objetivo",
    });

    await expect(
      prisma.series_recorrencia.findUniqueOrThrow({
        where: { recurrence_series_id: firstOccurrence.recurrence_series_id! },
      }),
    ).resolves.toMatchObject({
      objetivo_id: objective.id,
      termination_policy: "ate_objetivo",
    });
  });

  it("rejects an until-objective recurrence without an objective", async () => {
    await expect(
      createRecurringMission({ duration_type: "ate_objetivo" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects an until-date recurrence without an end date", async () => {
    await expect(
      createRecurringMission({ duration_type: "prazo" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects a recurrence without weekdays", async () => {
    await expect(
      createRecurringMission({ recurrence_weekdays: [] }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects a recurrence linked to another user's objective", async () => {
    const suffix = `${Date.now()}-${Math.random()}`;
    const otherUser = await prisma.usuarios.create({
      data: {
        usuario: `other-${suffix}`,
        email: `other-${suffix}@bunker.local`,
        senha_hash: "hash",
      },
    });
    const objective = await prisma.objetivos.create({
      data: {
        usuario_id: otherUser.usuario_id,
        titulo: "Objetivo de outro usuário",
      },
    });

    await expect(
      createRecurringMission({ objetivo_id: objective.id }),
    ).rejects.toMatchObject({ status: 400 });
    await prisma.usuarios.delete({ where: { usuario_id: otherUser.usuario_id } });
  });

  it("rejects a recurrence linked to an inactive objective", async () => {
    const objective = await createObjective("Objetivo pausado");
    await prisma.objetivos.update({
      where: { id: objective.id },
      data: { status: "pausado" },
    });

    await expect(
      createRecurringMission({ objetivo_id: objective.id }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("materializes the same series repeatedly without duplicating dates", async () => {
    const firstOccurrence = await createRecurringMission();
    const seriesId = firstOccurrence.recurrence_series_id!;
    currentDate = "2026-09-08";

    await missionsService.listAllForUser(currentUser);
    const afterFirstMaterialization = await prisma.missoes.count({
      where: { recurrence_series_id: seriesId },
    });
    await missionsService.listAllForUser(currentUser);
    const afterSecondMaterialization = await prisma.missoes.count({
      where: { recurrence_series_id: seriesId },
    });
    const duplicatedDates = await prisma.missoes.groupBy({
      by: ["prazo"],
      where: { recurrence_series_id: seriesId },
      _count: { _all: true },
      having: { prazo: { _count: { gt: 1 } } },
    });

    expect(afterSecondMaterialization).toBe(afterFirstMaterialization);
    expect(duplicatedDates).toEqual([]);
  });

  it("uses the database uniqueness guarantee under concurrent materialization", async () => {
    const firstOccurrence = await createRecurringMission();
    const seriesId = firstOccurrence.recurrence_series_id!;
    currentDate = "2026-09-08";

    await Promise.all([
      missionsService.listAllForUser(currentUser),
      missionsService.listAllForUser(currentUser),
    ]);

    const occurrences = await prisma.missoes.findMany({
      where: { recurrence_series_id: seriesId },
      orderBy: { prazo: "asc" },
    });
    expect(new Set(occurrences.map((mission) => mission.prazo?.toISOString())).size).toBe(
      occurrences.length,
    );
  });

  it("continues materializing after one occurrence is completed", async () => {
    const firstOccurrence = await createRecurringMission();
    const seriesId = firstOccurrence.recurrence_series_id!;
    const initialCount = await prisma.missoes.count({ where: { recurrence_series_id: seriesId } });

    await missionsService.complete(firstOccurrence.missao_id, currentUser);
    currentDate = "2026-09-08";
    await missionsService.listAllForUser(currentUser);

    const finalized = await prisma.missoes.findUniqueOrThrow({ where: { missao_id: firstOccurrence.missao_id } });
    const finalCount = await prisma.missoes.count({ where: { recurrence_series_id: seriesId } });
    expect(finalized.status).toBe(MISSION_STATUS.completed);
    expect(finalCount).toBeGreaterThan(initialCount);
  });

  it("continues materializing after one occurrence fails", async () => {
    const firstOccurrence = await createRecurringMission();
    const seriesId = firstOccurrence.recurrence_series_id!;
    const initialCount = await prisma.missoes.count({ where: { recurrence_series_id: seriesId } });

    await missionsService.fail(firstOccurrence.missao_id, currentUser);
    currentDate = "2026-09-08";
    await missionsService.listAllForUser(currentUser);

    const finalized = await prisma.missoes.findUniqueOrThrow({ where: { missao_id: firstOccurrence.missao_id } });
    const finalCount = await prisma.missoes.count({ where: { recurrence_series_id: seriesId } });
    expect(finalized.status).toBe(MISSION_STATUS.failed);
    expect(finalCount).toBeGreaterThan(initialCount);
  });

  it.each(["concluido", "pausado", "abandonado"])(
    "does not materialize an until-objective series when the objective is %s",
    async (status) => {
      const objective = await createObjective(`Objetivo ${status}`);
      const firstOccurrence = await createRecurringMission({
        objetivo_id: objective.id,
        duration_type: "ate_objetivo",
      });
      const seriesId = firstOccurrence.recurrence_series_id!;
      const initialCount = await prisma.missoes.count({ where: { recurrence_series_id: seriesId } });
      await prisma.objetivos.update({
        where: { id: objective.id },
        data: {
          status,
          concluded_at: status === "concluido" ? new Date() : null,
        },
      });

      currentDate = "2026-09-08";
      await missionsService.listAllForUser(currentUser);

      await expect(
        prisma.missoes.count({ where: { recurrence_series_id: seriesId } }),
      ).resolves.toBe(initialCount);
    },
  );

  it("deactivates an until-objective series when its objective is deleted", async () => {
    const objective = await createObjective("Objetivo descartável");
    const firstOccurrence = await createRecurringMission({
      objetivo_id: objective.id,
      duration_type: "ate_objetivo",
    });
    const seriesId = firstOccurrence.recurrence_series_id!;
    const occurrenceCount = await prisma.missoes.count({ where: { recurrence_series_id: seriesId } });

    await goalsService.delete(currentUser, objective.id);

    await expect(
      prisma.series_recorrencia.findUniqueOrThrow({
        where: { recurrence_series_id: seriesId },
      }),
    ).resolves.toMatchObject({ ativo: false, objetivo_id: null });
    await expect(
      prisma.missoes.count({ where: { recurrence_series_id: seriesId } }),
    ).resolves.toBe(occurrenceCount);
  });

  it("keeps a legacy recurrence outside recurrence series", async () => {
    const objective = await createObjective("Objetivo legado");
    const legacyKey = `${objective.id}||Legado||2026-08-31`;
    await prisma.missoes.create({
      data: {
        titulo: "Legado",
        prazo: new Date("2026-08-31T00:00:00.000Z"),
        recurrence_weekdays: [0],
        duration_type: "ate_objetivo",
        recurrence_key: legacyKey,
        criada_por_id: userId,
        responsavel_id: userId,
        objetivo_id: objective.id,
      },
    });

    currentDate = "2026-09-08";
    await missionsService.listAllForUser(currentUser);

    expect(await prisma.series_recorrencia.count({ where: { responsavel_id: userId } })).toBe(0);
    const legacyOccurrences = await prisma.missoes.findMany({
      where: { responsavel_id: userId },
    });
    expect(legacyOccurrences.every((mission) => mission.recurrence_series_id === null)).toBe(true);
    expect(legacyOccurrences.some((mission) => mission.recurrence_key === legacyKey)).toBe(true);
  });
});
