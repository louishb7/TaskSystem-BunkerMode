import { UserRecord } from "../src/auth/auth.types";
import { OperationalCalendarService } from "../src/calendar/operational-calendar.service";
import { toTaskResponse } from "../src/tasks/task-response";
import { TasksService } from "../src/tasks/tasks.service";
import { TASK_STATUS, TaskRecord } from "../src/tasks/task.types";
import { PrismaService } from "../src/prisma/prisma.service";

function user(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    usuario_id: 7,
    usuario: "general",
    email: "general@bunker.local",
    senha_hash: "hash",
    ativo: true,
    enabled_modules: ["tasks", "objectives"],
    timezone: "America/Recife",
    created_at: new Date("2026-04-24T12:00:00.000Z"),
    updated_at: new Date("2026-04-24T12:00:00.000Z"),
    ...overrides,
  };
}

function task(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    missao_id: 10,
    titulo: "Revisar plano semanal",
    prioridade: 2,
    prazo: new Date("2026-04-25T00:00:00.000Z"),
    instrucao: "Abrir relatório e registrar decisões.",
    status: TASK_STATUS.pending,
    is_pinned: false,
    created_at: new Date("2026-04-24T12:00:00.000Z"),
    updated_at: new Date("2026-04-24T12:00:00.000Z"),
    completed_at: null,
    failed_at: null,
    recurrence_series_id: null,
    criada_por_id: 7,
    responsavel_id: 7,
    objetivo_id: null,
    ...overrides,
  };
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
  };
}

describe("Tasks clean domain", () => {
  const calendar = new OperationalCalendarService();

  it("maps the task contract consumed by the web", () => {
    const response = toTaskResponse(task(), user());

    expect(response).toMatchObject({
      id: 10,
      titulo: "Revisar plano semanal",
      prazo: "25-04-2026",
      status: "PENDENTE",
      status_code: "PENDENTE",
      status_label: "Pendente",
      user_id: 7,
      responsavel_id: 7,
    });
    expect(Object.keys(response).sort()).toEqual(
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
    expect(response.permissions).toEqual({
      can_complete: true,
      can_edit: true,
      can_delete: true,
      can_fail: true,
      can_pin: true,
      can_view_history: false,
    });
  });

  it("restricts task permissions by ownership", () => {
    const foreignPermissions = toTaskResponse(
      task(),
      user({ usuario_id: 99 }),
    ).permissions;

    expect(foreignPermissions).toEqual({
      can_complete: false,
      can_edit: false,
      can_delete: false,
      can_fail: false,
      can_pin: false,
      can_view_history: false,
    });
  });

  it("materializes the canonical tasks read without materializing history", async () => {
    const prisma = prismaMock();
    const completed = task({
      missao_id: 11,
      status: TASK_STATUS.completed,
      completed_at: new Date("2026-08-13T12:00:00.000Z"),
    });
    const failed = task({
      missao_id: 12,
      status: TASK_STATUS.failed,
      failed_at: new Date("2026-08-13T12:00:00.000Z"),
    });
    prisma.missoes.findMany.mockResolvedValue([task(), completed, failed]);
    const service = new TasksService(
      prisma as unknown as PrismaService,
      calendar,
    );

    await expect(service.listForTasksBoard(user())).resolves.toEqual([
      task(),
      completed,
      failed,
    ]);
    expect(prisma.series_recorrencia.findMany).toHaveBeenCalledWith({
      where: { responsavel_id: 7, ativo: true },
      include: { objetivos: true },
    });
    expect(prisma.missoes.findMany).toHaveBeenCalledWith({
      where: { responsavel_id: 7 },
      include: { serie_recorrencia: true },
      orderBy: [
        { is_pinned: "desc" },
        { status: "asc" },
        { prazo: "asc" },
        { missao_id: "asc" },
      ],
    });

    prisma.series_recorrencia.findMany.mockClear();
    await expect(service.listHistorical(user())).resolves.toEqual([
      completed,
      failed,
    ]);
    expect(prisma.series_recorrencia.findMany).not.toHaveBeenCalled();
  });

  it("uses the recurrence series as the V2 recurrence response source", () => {
    const response = toTaskResponse(
      task({
        recurrence_series_id: 21,
        serie_recorrencia: {
          recurrence_series_id: 21,
          recurrence_weekdays: [0, 2, 4],
          termination_policy: "ate_data",
          end_date: new Date("2026-05-15T00:00:00.000Z"),
        },
      }),
      user(),
    );

    expect(response.recurrence).toEqual({
      series_id: 21,
      weekdays: [0, 2, 4],
      termination_policy: "ate_data",
      end_date: "15-05-2026",
    });
  });

  it("allows the owner to edit, reschedule and delete a one-time task", async () => {
    const prisma = prismaMock();
    prisma.missoes.findFirst.mockResolvedValue(task());
    prisma.missoes.update.mockResolvedValue(task({
      titulo: "Ordem ajustada",
      prazo: new Date("2026-04-26T00:00:00.000Z"),
    }));
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        auditoria_eventos: prisma.auditoria_eventos,
        missoes: prisma.missoes,
      }),
    );
    const service = new TasksService(
      prisma as unknown as PrismaService,
      calendar,
    );
    const owner = user();

    await expect(
      service.update(
        10,
        { titulo: "Ordem ajustada", prazo: "26-04-2026" },
        owner,
      ),
    ).resolves.toMatchObject({
      titulo: "Ordem ajustada",
    });
    await expect(service.delete(10, owner)).resolves.toBeUndefined();

    expect(prisma.missoes.update).toHaveBeenCalled();
    expect(prisma.missoes.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          prazo: new Date("2026-04-26T00:00:00.000Z"),
        }),
      }),
    );
    expect(prisma.missoes.delete).toHaveBeenCalledWith({
      where: { missao_id: 10 },
    });
  });

  it("protects recurring occurrences from deletion and rescheduling while allowing other edits", async () => {
    const prisma = prismaMock();
    const occurrence = task({ recurrence_series_id: 21 });
    prisma.missoes.findFirst.mockResolvedValue(occurrence);
    prisma.missoes.update.mockResolvedValue(
      task({ recurrence_series_id: 21, titulo: "Instrução ajustada" }),
    );
    prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
    const service = new TasksService(
      prisma as unknown as PrismaService,
      calendar,
    );

    await expect(service.delete(10, user())).rejects.toMatchObject({ status: 400 });
    await expect(
      service.update(10, { prazo: "26-04-2026" }, user()),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.update(10, { titulo: "Instrução ajustada" }, user()),
    ).resolves.toMatchObject({ titulo: "Instrução ajustada" });

    expect(prisma.missoes.delete).not.toHaveBeenCalled();
    expect(prisma.missoes.update).toHaveBeenCalledTimes(1);
    expect(toTaskResponse(occurrence, user()).permissions.can_delete).toBe(false);
  });

  it("rejects updates to another user's task", async () => {
    const prisma = prismaMock();
    prisma.missoes.findFirst.mockResolvedValue(null);
    const service = new TasksService(
      prisma as unknown as PrismaService,
      calendar,
    );

    await expect(
      service.update(
        10,
        { titulo: "Acesso indevido" },
        user({ usuario_id: 99 }),
      ),
    ).rejects.toMatchObject({ status: 404 });
    expect(prisma.missoes.update).not.toHaveBeenCalled();
  });

  it("creates a manual task with direct ownership and audit event", async () => {
    const prisma = prismaMock();
    const createdTask = task();
    const create = jest.fn().mockResolvedValue(createdTask);
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        auditoria_eventos: prisma.auditoria_eventos,
        missoes: { create, findUnique: prisma.missoes.findUnique },
      }),
    );
    const service = new TasksService(
      prisma as unknown as PrismaService,
      calendar,
    );

    const result = await service.create(
      {
        titulo: " Revisar plano semanal ",
        instrucao: " Abrir relatório ",
        prazo: "25-04-2026",
        responsavel_id: 7,
        objetivo_id: null,
      },
      user(),
    );

    expect(result.missao_id).toBe(10);
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        titulo: "Revisar plano semanal",
        instrucao: "Abrir relatório",
        status: TASK_STATUS.pending,
        criada_por_id: 7,
        responsavel_id: 7,
        objetivo_id: null,
        recurrence_series_id: null,
      }),
    });
    expect(prisma.auditoria_eventos.create).toHaveBeenCalledWith({
      data: {
        missao_id: 10,
        usuario_id: 7,
        acao: "tarefa_criada",
        detalhes: "Tarefa 'Revisar plano semanal' criada.",
      },
    });
  });

  it("creates a recurrence series and materializes occurrences with series identity", async () => {
    const prisma = prismaMock();
    const createdTasks = [
      task({ missao_id: 10, prazo: new Date("2026-04-24T00:00:00.000Z") }),
      task({ missao_id: 11, prazo: new Date("2026-04-27T00:00:00.000Z") }),
      task({ missao_id: 12, prazo: new Date("2026-04-29T00:00:00.000Z") }),
      task({ missao_id: 13, prazo: new Date("2026-05-01T00:00:00.000Z") }),
      task({ missao_id: 14, prazo: new Date("2026-05-04T00:00:00.000Z") }),
      task({ missao_id: 15, prazo: new Date("2026-05-06T00:00:00.000Z") }),
    ];
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
    };
    prisma.series_recorrencia.create.mockResolvedValue(series);
    prisma.missoes.createManyAndReturn.mockResolvedValue(createdTasks);
    prisma.objetivos.findFirst.mockResolvedValue({
      id: 7,
      usuario_id: 7,
      status: "ativo",
    });
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        auditoria_eventos: prisma.auditoria_eventos,
        missoes: { createManyAndReturn: prisma.missoes.createManyAndReturn },
        series_recorrencia: prisma.series_recorrencia,
      }),
    );
    const service = new TasksService(
      prisma as unknown as PrismaService,
      calendar,
    );

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
    );

    expect(result.missao_id).toBe(10);
    expect(prisma.series_recorrencia.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        objetivo_id: 7,
        recurrence_weekdays: [0, 2, 4],
        termination_policy: "ate_objetivo",
      }),
    });
    const occurrenceCall = prisma.missoes.createManyAndReturn.mock.calls[0][0];
    expect(
      occurrenceCall.data.map((item: { prazo: Date }) =>
        item.prazo.toISOString().slice(0, 10),
      ),
    ).toEqual([
      "2026-04-24",
      "2026-04-27",
      "2026-04-29",
      "2026-05-01",
      "2026-05-04",
      "2026-05-06",
    ]);
    expect(occurrenceCall.skipDuplicates).toBe(true);
    expect(occurrenceCall.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          recurrence_series_id: 21,
        }),
      ]),
    );
  });

  it("builds the focus board with today's tasks and records overdue failures", async () => {
    const prisma = prismaMock();
    prisma.missoes.findMany
      .mockResolvedValueOnce([
        task({ missao_id: 10, prazo: new Date("2026-08-12T00:00:00.000Z") }),
      ])
      .mockResolvedValueOnce([
        task({
          missao_id: 10,
          prazo: new Date("2026-08-12T00:00:00.000Z"),
          status: TASK_STATUS.failed,
          failed_at: new Date("2026-08-13T12:00:00.000Z"),
        }),
        task({ missao_id: 11, prazo: new Date("2026-08-13T00:00:00.000Z") }),
      ]);
    prisma.$transaction.mockResolvedValue([]);
    const service = new TasksService(
      prisma as unknown as PrismaService,
      calendar,
    );
    jest.useFakeTimers().setSystemTime(new Date("2026-08-13T12:00:00.000Z"));

    const board = await service.focusBoard(user());

    expect(board.action_tasks.map((item) => item.missao_id)).toEqual([11]);
    expect(prisma.$transaction).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it("preserves completed and failed tasks in history by allowing delete only while pending", async () => {
    const prisma = prismaMock();
    prisma.missoes.findFirst.mockResolvedValue(
      task({ status: TASK_STATUS.failed }),
    );
    const service = new TasksService(
      prisma as unknown as PrismaService,
      calendar,
    );

    await expect(service.delete(10, user())).rejects.toMatchObject({
      status: 400,
    });
    expect(prisma.missoes.delete).not.toHaveBeenCalled();
  });

  it("creates and edits links only to an active owned goal", async () => {
    const prisma = prismaMock();
    prisma.objetivos.findFirst.mockResolvedValue({
      id: 3,
      usuario_id: 7,
      status: "ativo",
    });
    prisma.missoes.findFirst.mockResolvedValue(task());
    prisma.missoes.create.mockResolvedValue(task({ objetivo_id: 3 }));
    prisma.missoes.update.mockResolvedValue(task({ objetivo_id: 3 }));
    prisma.$transaction.mockImplementation(async (callback) =>
      callback(prisma),
    );
    const service = new TasksService(prisma as never, calendar);
    await expect(
      service.create({ titulo: "Ordem do objetivo", objetivo_id: 3 }, user()),
    ).resolves.toMatchObject({ objetivo_id: 3 });
    await service.update(10, { objetivo_id: 3 }, user());
    expect(prisma.objetivos.findFirst).toHaveBeenCalledWith({
      where: { id: 3, usuario_id: 7, status: "ativo" },
    });
    expect(prisma.missoes.update).toHaveBeenCalledWith({
      where: { missao_id: 10 },
      data: { objetivos: { connect: { id: 3 } } },
      include: { serie_recorrencia: true },
    });
    prisma.objetivos.findFirst.mockResolvedValue(null);
    await expect(
      service.create({ titulo: "Vínculo inválido", objetivo_id: 99 }, user()),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.update(10, { objetivo_id: 99 }, user()),
    ).rejects.toMatchObject({ status: 400 });
    expect(prisma.missoes.create).toHaveBeenCalledTimes(1);
    expect(prisma.missoes.update).toHaveBeenCalledTimes(1);
  });

  it("validates only a new goal association during task updates", async () => {
    const prisma = prismaMock();
    prisma.missoes.findFirst.mockResolvedValue(task({ objetivo_id: 3 }));
    prisma.missoes.update.mockImplementation(async ({ data }) =>
      task({
        ...data,
        objetivo_id:
          "objetivos" in data && data.objetivos && "connect" in data.objetivos
            ? data.objetivos.connect.id
            : data.objetivos && "disconnect" in data.objetivos
              ? null
              : 3,
      }),
    );
    prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
    const service = new TasksService(prisma as never, calendar);

    await expect(
      service.update(10, { titulo: "Editar vínculo existente" }, user()),
    ).resolves.toMatchObject({ objetivo_id: 3 });
    await expect(
      service.update(
        10,
        { titulo: "Reenviar vínculo existente", objetivo_id: 3 },
        user(),
      ),
    ).resolves.toMatchObject({ objetivo_id: 3 });
    expect(prisma.objetivos.findFirst).not.toHaveBeenCalled();

    prisma.objetivos.findFirst.mockResolvedValue({
      id: 4,
      usuario_id: 7,
      status: "ativo",
    });
    await expect(
      service.update(10, { objetivo_id: 4 }, user()),
    ).resolves.toMatchObject({ objetivo_id: 4 });
    expect(prisma.objetivos.findFirst).toHaveBeenCalledWith({
      where: { id: 4, usuario_id: 7, status: "ativo" },
    });

    prisma.objetivos.findFirst.mockResolvedValue(null);
    await expect(service.update(10, { objetivo_id: 99 }, user())).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      service.update(10, { objetivo_id: null }, user()),
    ).resolves.toMatchObject({ objetivo_id: null });
  });

  it("disconnects the goal without configuring recurrence on the occurrence", async () => {
    const prisma = prismaMock();
    prisma.missoes.findFirst.mockResolvedValue(
      task({ objetivo_id: 3, recurrence_series_id: 21 }),
    );
    prisma.missoes.update.mockResolvedValue(
      task({ recurrence_series_id: 21 }),
    );
    prisma.$transaction.mockImplementation(async (callback) =>
      callback(prisma),
    );
    const service = new TasksService(prisma as never, calendar);
    await service.update(10, { objetivo_id: null }, user());
    expect(prisma.objetivos.findFirst).not.toHaveBeenCalled();
    expect(prisma.missoes.update).toHaveBeenCalledWith({
      where: { missao_id: 10 },
      data: { objetivos: { disconnect: true } },
      include: { serie_recorrencia: true },
    });
  });

  it.each(["recurrence_weekdays", "recurrence_end_date", "duration_type"])(
    "rejects PATCH configuration %s instead of storing it on an occurrence",
    async (field) => {
      const prisma = prismaMock();
      prisma.missoes.findFirst.mockResolvedValue(task());
      const service = new TasksService(prisma as never, calendar);
      await expect(
        service.update(10, { titulo: "Ordem", [field]: null }, user()),
      ).rejects.toMatchObject({ status: 400 });
      expect(prisma.missoes.update).not.toHaveBeenCalled();
    },
  );

  it.each([
    { duration_type: "ate_objetivo", recurrence_weekdays: [0] },
    { duration_type: "ate_data", recurrence_weekdays: [0] },
    { duration_type: "sem_termino", recurrence_weekdays: [] },
    { duration_type: "sem_termino", recurrence_weekdays: [7] },
    {
      duration_type: "ate_data",
      recurrence_weekdays: [0],
      recurrence_end_date: "2026-08-30",
    },
  ])(
    "rejects invalid series configuration before writing: %j",
    async (configuration) => {
      const prisma = prismaMock();
      const service = new TasksService(prisma as never, calendar);
      await expect(
        service.create(
          { titulo: "Repetir", prazo: "2026-08-31", ...configuration },
          user(),
        ),
      ).rejects.toMatchObject({ status: 400 });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it.each(["sem_termino", "ate_data"])(
    "creates %s recurrence without a goal using only series configuration",
    async (policy) => {
      const prisma = prismaMock();
      prisma.$transaction.mockImplementation(async (callback) =>
        callback(prisma),
      );
      prisma.series_recorrencia.create.mockImplementation(async ({ data }) => ({
        recurrence_series_id: 21,
        ...data,
      }));
      prisma.missoes.createManyAndReturn.mockImplementation(async ({ data }) =>
        data.map((item: object, index: number) =>
          task({ ...item, missao_id: 10 + index }),
        ),
      );
      const service = new TasksService(prisma as never, calendar);
      const result = await service.create(
        {
          titulo: "Repetir",
          prazo: "2026-08-31",
          recurrence_weekdays: [2, 0, 2],
          duration_type: policy,
          recurrence_end_date: policy === "ate_data" ? "2026-09-02" : null,
        },
        user(),
      );
      expect(result).toMatchObject({
        objetivo_id: null,
        recurrence_series_id: 21,
      });
      expect(prisma.objetivos.findFirst).not.toHaveBeenCalled();
      const dates =
        prisma.missoes.createManyAndReturn.mock.calls[0][0].data.map(
          (item: { prazo: Date }) => item.prazo.toISOString().slice(0, 10),
        );
      expect(dates).toEqual(
        policy === "ate_data"
          ? ["2026-08-31", "2026-09-02"]
          : ["2026-08-31", "2026-09-02", "2026-09-07", "2026-09-09"],
      );
      expect(prisma.auditoria_eventos.createMany).toHaveBeenCalledTimes(1);
    },
  );

  it.each(["complete", "fail"] as const)(
    "records %s without modifying the goal or series",
    async (action) => {
      const prisma = prismaMock();
      prisma.missoes.findFirst.mockResolvedValue(
        task({ objetivo_id: 3, recurrence_series_id: 21 }),
      );
      prisma.missoes.update.mockImplementation(async ({ data }) =>
        task(data),
      );
      prisma.$transaction.mockImplementation(async (callback) =>
        callback(prisma),
      );
      const service = new TasksService(prisma as never, calendar);
      const result = await service[action](10, user());
      expect(result.status).toBe(action === "complete" ? "CONCLUIDA" : "FALHA");
      expect(result.completed_at).toEqual(
        action === "complete" ? expect.any(Date) : null,
      );
      expect(result.failed_at).toEqual(
        action === "fail" ? expect.any(Date) : null,
      );
      expect(prisma.objetivos.findFirst).not.toHaveBeenCalled();
      expect(prisma.series_recorrencia.updateMany).not.toHaveBeenCalled();
      expect(prisma.auditoria_eventos.create).toHaveBeenCalledTimes(1);
    },
  );
});
