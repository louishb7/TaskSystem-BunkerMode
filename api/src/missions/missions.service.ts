import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Prisma, series_recorrencia } from "@prisma/client";

import { GOAL_STATUS } from "../goals/goals.types";
import { UserRecord } from "../auth/auth.types";
import { OperationalCalendarService } from "../calendar/operational-calendar.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  DEFAULT_PRIORITY,
  MISSION_INSTRUCTION_MAX_LENGTH,
  MISSION_STATUS,
  MissionRecord,
} from "./mission.types";

type CreateMissionPayload = {
  titulo?: unknown;
  prioridade?: unknown;
  prazo?: unknown;
  instrucao?: unknown;
  responsavel_id?: unknown;
  objetivo_id?: unknown;
  recurrence_weekdays?: unknown;
  recurrence_end_date?: unknown;
  duration_type?: unknown;
};

type UpdateMissionPayload = Partial<
  Pick<
    CreateMissionPayload,
    "titulo" | "instrucao" | "prioridade" | "prazo" | "objetivo_id"
  >
> & {
  status?: unknown;
};

const RECURRENCE_WINDOW_DAYS = 14;

type RecurrenceTerminationPolicy = "sem_termino" | "ate_data" | "ate_objetivo";

function text(value: unknown, message: string): string {
  if (typeof value !== "string") {
    throw new HttpException(message, HttpStatus.BAD_REQUEST);
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new HttpException(message, HttpStatus.BAD_REQUEST);
  }
  return normalized;
}

function optionalText(value: unknown, maxLength?: number): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    throw new HttpException("Campo textual inválido.", HttpStatus.BAD_REQUEST);
  }
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  if (maxLength !== undefined && normalized.length > maxLength) {
    throw new HttpException(
      "Instrução excede o limite permitido.",
      HttpStatus.BAD_REQUEST,
    );
  }
  return normalized;
}

function optionalId(value: unknown, message: string): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new HttpException(message, HttpStatus.BAD_REQUEST);
  }
  return value;
}

function priority(value: unknown): number {
  if (value === null || value === undefined) {
    return DEFAULT_PRIORITY;
  }
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 3
  ) {
    throw new HttpException("Prioridade inválida.", HttpStatus.BAD_REQUEST);
  }
  return value;
}

function dateFromPayload(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw new HttpException("Data inválida.", HttpStatus.BAD_REQUEST);
  }
  const normalized = value.trim();
  const parts = normalized.includes("-") ? normalized.split("-") : [];
  const isoParts = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ? parts.map(Number)
    : /^\d{2}-\d{2}-\d{4}$/.test(normalized)
      ? [Number(parts[2]), Number(parts[1]), Number(parts[0])]
      : null;
  if (!isoParts) {
    throw new HttpException("Data inválida.", HttpStatus.BAD_REQUEST);
  }
  const [year, month, day] = isoParts;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new HttpException("Data inválida.", HttpStatus.BAD_REQUEST);
  }
  return date;
}

function isoDateFromDate(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function startOfIsoDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function statusFromPayload(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new HttpException("Status inválido.", HttpStatus.BAD_REQUEST);
  }
  const normalized = value.trim().toUpperCase();
  if (normalized === MISSION_STATUS.pending) {
    return MISSION_STATUS.pending;
  }
  throw new HttpException(
    "Use concluir ou falhar para registrar resultado de execução.",
    HttpStatus.BAD_REQUEST,
  );
}

function recurrenceWeekdays(value: unknown): number[] {
  if (value === null || value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new HttpException(
      "Frequência semanal da missão deve ser uma lista.",
      HttpStatus.BAD_REQUEST,
    );
  }
  const normalized: number[] = [];
  for (const weekday of value) {
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      throw new HttpException(
        "Dias da frequência semanal devem estar entre 0 e 6.",
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!normalized.includes(weekday)) {
      normalized.push(weekday);
    }
  }
  return normalized.sort((left, right) => left - right);
}

function recurrenceTerminationPolicy(
  value: unknown,
  weekdays: number[],
): RecurrenceTerminationPolicy | null {
  if (value === "pontual") {
    return null;
  }

  let policy: RecurrenceTerminationPolicy | null = null;
  if (value === null || value === undefined || value === "") {
    policy = weekdays.length > 0 ? "sem_termino" : null;
  } else if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "sem_termino") {
      policy = "sem_termino";
    } else if (normalized === "ate_data") {
      policy = "ate_data";
    } else if (normalized === "ate_objetivo") {
      policy = "ate_objetivo";
    } else if (normalized === "pontual") {
      return null;
    } else {
      throw new HttpException(
        "Política de término da recorrência é inválida.",
        HttpStatus.BAD_REQUEST,
      );
    }
  } else {
    throw new HttpException(
      "Política de término da recorrência é inválida.",
      HttpStatus.BAD_REQUEST,
    );
  }

  if (policy !== null && weekdays.length === 0) {
    throw new HttpException(
      "Informe ao menos um dia da frequência semanal.",
      HttpStatus.BAD_REQUEST,
    );
  }
  return policy;
}

function addDays(value: Date, amount: number): Date {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function weekdayFor(value: Date): number {
  return (value.getUTCDay() + 6) % 7;
}

function datesForRecurrence(
  start: Date,
  end: Date,
  weekdays: number[],
): Date[] {
  const dates: Date[] = [];
  for (
    let cursor = new Date(start);
    cursor <= end;
    cursor = addDays(cursor, 1)
  ) {
    if (weekdays.includes(weekdayFor(cursor))) {
      dates.push(new Date(cursor));
    }
  }
  return dates;
}

@Injectable()
export class MissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calendar: OperationalCalendarService,
  ) {}

  async listForGeneralBoard(user: UserRecord): Promise<MissionRecord[]> {
    return this.prisma.missoes.findMany({
      where: {
        responsavel_id: user.usuario_id,
        status: MISSION_STATUS.pending,
      },
      include: { serie_recorrencia: true },
      orderBy: [{ is_pinned: "desc" }, { prazo: "asc" }, { missao_id: "asc" }],
    });
  }

  async listAllForUser(
    user: UserRecord,
    options: { materializeRecurrences?: boolean } = {},
  ): Promise<MissionRecord[]> {
    if (options.materializeRecurrences !== false) {
      await this.materializeSeriesRecurrences(user);
    }
    return this.prisma.missoes.findMany({
      where: { responsavel_id: user.usuario_id },
      include: { serie_recorrencia: true },
      orderBy: [
        { is_pinned: "desc" },
        { status: "asc" },
        { prazo: "asc" },
        { missao_id: "asc" },
      ],
    });
  }

  async listHistorical(user: UserRecord): Promise<MissionRecord[]> {
    const missions = await this.listAllForUser(user, {
      materializeRecurrences: false,
    });
    return missions.filter(
      (mission) =>
        mission.status === MISSION_STATUS.completed ||
        mission.status === MISSION_STATUS.failed,
    );
  }

  async create(
    payload: CreateMissionPayload,
    user: UserRecord,
  ): Promise<MissionRecord> {
    const title = text(payload.titulo, "Título da missão é obrigatório.");
    const instruction = optionalText(
      payload.instrucao,
      MISSION_INSTRUCTION_MAX_LENGTH,
    );
    const weekdays = recurrenceWeekdays(payload.recurrence_weekdays);
    const recurrencePolicy = recurrenceTerminationPolicy(
      payload.duration_type,
      weekdays,
    );
    const recurrenceEndDate = dateFromPayload(payload.recurrence_end_date);
    const objetivoId = optionalId(
      payload.objetivo_id,
      "Objetivo vinculado não encontrado.",
    );
    const responsavelId =
      optionalId(payload.responsavel_id, "Responsável inválido.") ??
      user.usuario_id;
    if (responsavelId !== user.usuario_id) {
      throw new HttpException("Responsável inválido.", HttpStatus.BAD_REQUEST);
    }

    const dueDate =
      dateFromPayload(payload.prazo) ?? startOfIsoDate(this.today(user));
    if (recurrencePolicy !== null) {
      if (recurrencePolicy === "ate_data" && recurrenceEndDate === null) {
        throw new HttpException(
          "Informe a data final da recorrência.",
          HttpStatus.BAD_REQUEST,
        );
      }
      if (recurrencePolicy === "ate_objetivo" && objetivoId === null) {
        throw new HttpException(
          "Recorrência até o objetivo exige um Objetivo vinculado.",
          HttpStatus.BAD_REQUEST,
        );
      }
      await this.ensureActiveGoal(user, objetivoId);

      const endDate =
        recurrencePolicy === "ate_data" ? recurrenceEndDate : null;
      const dates = this.recurrenceDates(dueDate, endDate, weekdays);
      if (dates.length === 0) {
        throw new HttpException(
          "A frequência semanal não gera ordens dentro da janela permitida.",
          HttpStatus.BAD_REQUEST,
        );
      }

      return this.prisma.$transaction(async (tx) => {
        const series = await tx.series_recorrencia.create({
          data: {
            responsavel_id: responsavelId,
            objetivo_id: objetivoId,
            titulo: title,
            instrucao: instruction,
            prioridade: priority(payload.prioridade),
            recurrence_weekdays: weekdays,
            start_date: dueDate,
            termination_policy: recurrencePolicy,
            end_date: endDate,
            ativo: true,
          },
        });
        const created = await this.createSeriesOccurrences(
          tx,
          series,
          dates,
          user.usuario_id,
        );
        const firstMission = this.firstMission(created);
        if (!firstMission) {
          throw new HttpException(
            "A frequência semanal não gera novas ordens dentro da janela permitida.",
            HttpStatus.BAD_REQUEST,
          );
        }
        return { ...firstMission, serie_recorrencia: series };
      });
    }

    await this.ensureActiveGoal(user, objetivoId);

    const created = await this.prisma.$transaction(async (tx) => {
      const mission = await tx.missoes.create({
        data: {
          titulo: title,
          prioridade: priority(payload.prioridade),
          prazo: dueDate,
          instrucao: instruction,
          status: MISSION_STATUS.pending,
          objetivo_id: objetivoId,
          recurrence_series_id: null,
          criada_por_id: user.usuario_id,
          responsavel_id: responsavelId,
        },
      });
      await tx.auditoria_eventos.create({
        data: {
          missao_id: mission.missao_id,
          usuario_id: user.usuario_id,
          acao: "missao_criada",
          detalhes: `Missão '${mission.titulo}' criada.`,
        },
      });
      return mission;
    });

    return created;
  }

  async listDailyOperational(user: UserRecord): Promise<MissionRecord[]> {
    const today = this.today(user);
    const missions = await this.listAllForUser(user);
    return this.sortForBoard(
      missions.filter((mission) =>
        this.belongsToOperationalDate(mission, today),
      ),
    );
  }

  async soldierBoard(user: UserRecord): Promise<{
    action_missions: MissionRecord[];
    daily_missions: MissionRecord[];
  }> {
    await this.failOverdueMissions(user);
    const today = this.today(user);
    const missions = await this.listAllForUser(user);
    const todayMissions = this.sortForBoard(
      missions.filter((mission) =>
        this.belongsToOperationalDate(mission, today),
      ),
    );
    const actionMissions = this.sortForBoard(
      todayMissions.filter((mission) => this.visibleToSoldier(mission, today)),
    );

    return {
      daily_missions: todayMissions,
      action_missions: actionMissions,
    };
  }

  async update(
    id: number,
    payload: UpdateMissionPayload,
    user: UserRecord,
  ): Promise<MissionRecord> {
    const current = await this.getMissionForUser(id, user);
    if (
      ["recurrence_weekdays", "recurrence_end_date", "duration_type"].some(
        (key) => Object.prototype.hasOwnProperty.call(payload, key),
      )
    ) {
      throw new HttpException(
        "A recorrência é definida na criação da ordem. A edição altera somente esta ordem.",
        HttpStatus.BAD_REQUEST,
      );
    }
    if (current.status !== MISSION_STATUS.pending) {
      throw new HttpException(
        "Apenas missão pendente pode ser editada.",
        HttpStatus.BAD_REQUEST,
      );
    }

    const objetivoId = Object.prototype.hasOwnProperty.call(
      payload,
      "objetivo_id",
    )
      ? optionalId(payload.objetivo_id, "Objetivo vinculado não encontrado.")
      : current.objetivo_id;
    await this.ensureActiveGoal(user, objetivoId);

    const data: Prisma.missoesUpdateInput = {};
    if (Object.prototype.hasOwnProperty.call(payload, "titulo")) {
      data.titulo = text(payload.titulo, "Título da missão é obrigatório.");
    }
    if (Object.prototype.hasOwnProperty.call(payload, "instrucao")) {
      data.instrucao = optionalText(
        payload.instrucao,
        MISSION_INSTRUCTION_MAX_LENGTH,
      );
    }
    if (Object.prototype.hasOwnProperty.call(payload, "prioridade")) {
      data.prioridade = priority(payload.prioridade);
    }
    if (Object.prototype.hasOwnProperty.call(payload, "prazo")) {
      data.prazo = dateFromPayload(payload.prazo);
    }
    if (Object.prototype.hasOwnProperty.call(payload, "status")) {
      const status = statusFromPayload(payload.status);
      if (status === MISSION_STATUS.pending) {
        data.status = MISSION_STATUS.pending;
        data.completed_at = null;
        data.failed_at = null;
      }
    }
    if (Object.prototype.hasOwnProperty.call(payload, "objetivo_id")) {
      data.objetivos =
        objetivoId === null
          ? { disconnect: true }
          : { connect: { id: objetivoId } };
    }

    return this.prisma.$transaction(async (tx) => {
      const mission = await tx.missoes.update({
        where: { missao_id: id },
        data,
        include: { serie_recorrencia: true },
      });
      await tx.auditoria_eventos.create({
        data: {
          missao_id: id,
          usuario_id: user.usuario_id,
          acao: "missao_atualizada",
          detalhes: `Missão '${mission.titulo}' atualizada.`,
        },
      });
      return mission;
    });
  }

  async complete(id: number, user: UserRecord): Promise<MissionRecord> {
    const current = await this.getMissionForUser(id, user);
    if (
      current.status !== MISSION_STATUS.pending ||
      current.completed_at !== null
    ) {
      throw new HttpException(
        "Missão não pode ser concluída neste estado.",
        HttpStatus.BAD_REQUEST,
      );
    }
    const now = new Date();
    return this.updateExecutionState(id, user, {
      data: {
        status: MISSION_STATUS.completed,
        completed_at: now,
        failed_at: null,
      },
      action: "missao_concluida",
      details: `Missão '${current.titulo}' concluída.`,
    });
  }

  async fail(id: number, user: UserRecord): Promise<MissionRecord> {
    const current = await this.getMissionForUser(id, user);
    if (current.status !== MISSION_STATUS.pending) {
      throw new HttpException(
        "Apenas missão pendente pode ser registrada como falha.",
        HttpStatus.BAD_REQUEST,
      );
    }
    const now = new Date();
    return this.updateExecutionState(id, user, {
      data: {
        status: MISSION_STATUS.failed,
        completed_at: null,
        failed_at: now,
      },
      action: "missao_nao_realizada",
      details: `Missão '${current.titulo}' registrada como falha.`,
    });
  }

  async togglePin(id: number, user: UserRecord): Promise<MissionRecord> {
    const current = await this.getMissionForUser(id, user);
    if (current.status !== MISSION_STATUS.pending) {
      throw new HttpException(
        "Prioridade disponível apenas para ordens pendentes.",
        HttpStatus.BAD_REQUEST,
      );
    }
    const pinned = !current.is_pinned;
    return this.updateExecutionState(id, user, {
      data: { is_pinned: pinned },
      action: pinned
        ? "missao_prioridade_fixada"
        : "missao_prioridade_removida",
      details: pinned
        ? "General fixou a missão no topo do dia."
        : "General removeu a missão do topo do dia.",
    });
  }

  async delete(id: number, user: UserRecord): Promise<void> {
    const current = await this.getMissionForUser(id, user);
    if (current.status !== MISSION_STATUS.pending) {
      throw new HttpException(
        "Apenas missão pendente pode ser removida. Resultados ficam no histórico.",
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.auditoria_eventos.deleteMany({ where: { missao_id: id } });
      await tx.missoes.delete({ where: { missao_id: id } });
      await tx.auditoria_eventos.create({
        data: {
          missao_id: null,
          usuario_id: user.usuario_id,
          acao: "missao_removida",
          detalhes: `Missão '${current.titulo}' removida.`,
        },
      });
    });
  }

  async missionHistory(id: number, user: UserRecord) {
    await this.getMissionForUser(id, user);
    return this.prisma.auditoria_eventos.findMany({
      where: { missao_id: id },
      orderBy: [{ criado_em: "asc" }, { evento_id: "asc" }],
    });
  }

  private async getMissionForUser(
    id: number,
    user: UserRecord,
  ): Promise<MissionRecord> {
    const mission = await this.prisma.missoes.findFirst({
      where: {
        missao_id: id,
        responsavel_id: user.usuario_id,
      },
    });
    if (!mission) {
      throw new HttpException(
        `Missão ${id} não encontrada`,
        HttpStatus.NOT_FOUND,
      );
    }
    return mission;
  }

  private async materializeSeriesRecurrences(user: UserRecord): Promise<void> {
    const today = startOfIsoDate(this.today(user));
    const windowEnd = addDays(today, RECURRENCE_WINDOW_DAYS - 1);
    const seriesList = await this.prisma.series_recorrencia.findMany({
      where: {
        responsavel_id: user.usuario_id,
        ativo: true,
      },
      include: { objetivos: true },
    });
    if (seriesList.length === 0) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      for (const series of seriesList) {
        if (series.termination_policy === "ate_objetivo") {
          if (series.objetivo_id === null || series.objetivos === null) {
            await tx.series_recorrencia.updateMany({
              where: {
                recurrence_series_id: series.recurrence_series_id,
                ativo: true,
              },
              data: { ativo: false },
            });
            continue;
          }
          if (series.objetivos.status !== GOAL_STATUS.active) {
            continue;
          }
        }

        const start = series.start_date > today ? series.start_date : today;
        const limit =
          series.termination_policy === "ate_data" &&
          series.end_date &&
          series.end_date < windowEnd
            ? series.end_date
            : windowEnd;
        if (limit < start) {
          continue;
        }

        const dates = datesForRecurrence(
          start,
          limit,
          series.recurrence_weekdays,
        );
        await this.createSeriesOccurrences(tx, series, dates, user.usuario_id);
      }
    });
  }

  private async createSeriesOccurrences(
    tx: Prisma.TransactionClient,
    series: series_recorrencia,
    dates: Date[],
    auditUserId: number,
  ): Promise<MissionRecord[]> {
    if (dates.length === 0) {
      return [];
    }

    const created = await tx.missoes.createManyAndReturn({
      data: dates.map((date) => ({
        titulo: series.titulo,
        prioridade: series.prioridade,
        prazo: date,
        instrucao: series.instrucao,
        status: MISSION_STATUS.pending,
        objetivo_id: series.objetivo_id,
        recurrence_series_id: series.recurrence_series_id,
        criada_por_id: series.responsavel_id,
        responsavel_id: series.responsavel_id,
      })),
      skipDuplicates: true,
    });

    if (created.length > 0) {
      await tx.auditoria_eventos.createMany({
        data: created.map((mission) => ({
          missao_id: mission.missao_id,
          usuario_id: auditUserId,
          acao: "missao_recorrente_criada",
          detalhes: `Recorrência gerou a ordem '${mission.titulo}'.`,
        })),
      });
    }
    return created;
  }

  private firstMission(missions: MissionRecord[]): MissionRecord | null {
    return (
      [...missions].sort((left, right) => {
        const leftDate = left.prazo?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const rightDate = right.prazo?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return leftDate - rightDate || left.missao_id - right.missao_id;
      })[0] ?? null
    );
  }

  private async ensureActiveGoal(
    user: UserRecord,
    objetivoId: number | null,
  ): Promise<void> {
    if (objetivoId === null) {
      return;
    }
    const objetivo = await this.prisma.objetivos.findFirst({
      where: {
        id: objetivoId,
        usuario_id: user.usuario_id,
        status: GOAL_STATUS.active,
      },
    });
    if (!objetivo) {
      throw new HttpException(
        "Objetivo vinculado não está ativo.",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async updateExecutionState(
    id: number,
    user: UserRecord,
    options: {
      data: Prisma.missoesUpdateInput;
      action: string;
      details: string;
    },
  ): Promise<MissionRecord> {
    return this.prisma.$transaction(async (tx) => {
      const mission = await tx.missoes.update({
        where: { missao_id: id },
        data: options.data,
        include: { serie_recorrencia: true },
      });
      await tx.auditoria_eventos.create({
        data: {
          missao_id: id,
          usuario_id: user.usuario_id,
          acao: options.action,
          detalhes: options.details,
        },
      });
      return mission;
    });
  }

  private async failOverdueMissions(user: UserRecord): Promise<void> {
    const today = this.today(user);
    const overdue = await this.prisma.missoes.findMany({
      where: {
        responsavel_id: user.usuario_id,
        status: MISSION_STATUS.pending,
        prazo: { lt: startOfIsoDate(today) },
      },
    });
    if (overdue.length === 0) {
      return;
    }
    const now = new Date();
    await this.prisma.$transaction(
      overdue.flatMap((mission) => [
        this.prisma.missoes.update({
          where: { missao_id: mission.missao_id },
          data: {
            status: MISSION_STATUS.failed,
            completed_at: null,
            failed_at: now,
          },
        }),
        this.prisma.auditoria_eventos.create({
          data: {
            missao_id: mission.missao_id,
            usuario_id: user.usuario_id,
            acao: "missao_falhou_por_prazo",
            detalhes: `Missão '${mission.titulo}' registrada como falha por prazo vencido.`,
          },
        }),
      ]),
    );
  }

  private today(user: UserRecord): string {
    return this.calendar.currentDateFor(new Date(), user.timezone);
  }

  private belongsToOperationalDate(
    mission: MissionRecord,
    isoDate: string,
  ): boolean {
    if (isoDateFromDate(mission.prazo) === isoDate) {
      return true;
    }
    const eventDate = mission.completed_at ?? mission.failed_at;
    return isoDateFromDate(eventDate) === isoDate;
  }

  private visibleToSoldier(mission: MissionRecord, isoDate: string): boolean {
    return (
      mission.status === MISSION_STATUS.pending &&
      isoDateFromDate(mission.prazo) === isoDate
    );
  }

  private sortForBoard(missions: MissionRecord[]): MissionRecord[] {
    return [...missions].sort((left, right) => {
      const pinned = Number(right.is_pinned) - Number(left.is_pinned);
      if (pinned !== 0) {
        return pinned;
      }
      const finalized =
        Number(left.status !== MISSION_STATUS.pending) -
        Number(right.status !== MISSION_STATUS.pending);
      if (finalized !== 0) {
        return finalized;
      }
      const leftDate = left.prazo ?? startOfIsoDate("9999-12-31");
      const rightDate = right.prazo ?? startOfIsoDate("9999-12-31");
      const dateDiff = leftDate.getTime() - rightDate.getTime();
      if (dateDiff !== 0) {
        return dateDiff;
      }
      return left.missao_id - right.missao_id;
    });
  }

  private recurrenceDates(
    start: Date,
    recurrenceEndDate: Date | null,
    weekdays: number[],
  ): Date[] {
    const defaultLimit = addDays(start, RECURRENCE_WINDOW_DAYS - 1);
    const limit =
      recurrenceEndDate && recurrenceEndDate < defaultLimit
        ? recurrenceEndDate
        : defaultLimit;
    if (limit < start) {
      throw new HttpException(
        "Prazo da recorrência não pode ser anterior à data inicial.",
        HttpStatus.BAD_REQUEST,
      );
    }
    return datesForRecurrence(start, limit, weekdays);
  }
}
