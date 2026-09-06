import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

import { UserRecord } from "../auth/auth.types";
import {
  optionalText,
  parseIsoDate,
  positiveInt,
  requiredText,
} from "../common/domain-helpers";
import { PrismaService } from "../prisma/prisma.service";
import { GOAL_STATUS, GoalResponse, toGoalResponse } from "./goals.types";

type CreateGoalPayload = {
  titulo?: unknown;
  descricao?: unknown;
  data_alvo?: unknown;
};

type UpdateGoalPayload = {
  titulo?: unknown;
  descricao?: unknown;
  data_alvo?: unknown;
};

type GoalOrderPayload = {
  objetivo_ids?: unknown;
};

function goalStatus(value: unknown): string {
  if (
    value !== GOAL_STATUS.active &&
    value !== GOAL_STATUS.concluded &&
    value !== GOAL_STATUS.paused &&
    value !== GOAL_STATUS.abandoned
  ) {
    throw new HttpException(
      "Status de objetivo inválido.",
      HttpStatus.BAD_REQUEST,
    );
  }
  return value;
}

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: UserRecord): Promise<GoalResponse[]> {
    const goals = await this.prisma.objetivos.findMany({
      where: { usuario_id: user.usuario_id },
      orderBy: [{ order_index: "asc" }, { created_at: "asc" }, { id: "asc" }],
    });
    return goals.map(toGoalResponse);
  }

  async create(
    user: UserRecord,
    payload: CreateGoalPayload,
  ): Promise<GoalResponse> {
    const orderIndex = await this.nextOrderIndex(user.usuario_id);
    const now = new Date();
    const goal = await this.prisma.objetivos.create({
      data: {
        usuario_id: user.usuario_id,
        titulo: requiredText(
          payload.titulo,
          "Título do objetivo é obrigatório.",
          200,
        ),
        descricao: optionalText(
          payload.descricao,
          "Descrição do objetivo inválida.",
        ),
        data_alvo: parseIsoDate(
          payload.data_alvo,
          "Data alvo do objetivo inválida.",
        ),
        status: GOAL_STATUS.active,
        order_index: orderIndex,
        created_at: now,
        updated_at: now,
      },
    });
    return toGoalResponse(goal);
  }

  async update(
    user: UserRecord,
    goalId: number,
    payload: UpdateGoalPayload,
  ): Promise<GoalResponse> {
    const existing = await this.findOwned(user, goalId);
    const goal = await this.prisma.objetivos.update({
      where: { id: existing.id },
      data: {
        ...(payload.titulo !== undefined
          ? {
              titulo: requiredText(
                payload.titulo,
                "Título do objetivo é obrigatório.",
                200,
              ),
            }
          : {}),
        ...(payload.descricao !== undefined
          ? {
              descricao: optionalText(
                payload.descricao,
                "Descrição do objetivo inválida.",
              ),
            }
          : {}),
        ...(payload.data_alvo !== undefined
          ? {
              data_alvo: parseIsoDate(
                payload.data_alvo,
                "Data alvo do objetivo inválida.",
              ),
            }
          : {}),
        updated_at: new Date(),
      },
    });
    return toGoalResponse(goal);
  }

  async updateStatus(
    user: UserRecord,
    goalId: number,
    value: unknown,
  ): Promise<GoalResponse> {
    const existing = await this.findOwned(user, goalId);
    const status = goalStatus(value);
    const now = new Date();
    const goal = await this.prisma.objetivos.update({
      where: { id: existing.id },
      data: {
        status,
        concluded_at: status === GOAL_STATUS.concluded ? now : null,
        updated_at: now,
      },
    });
    return toGoalResponse(goal);
  }

  async reorder(
    user: UserRecord,
    payload: GoalOrderPayload,
  ): Promise<GoalResponse[]> {
    if (
      !Array.isArray(payload.objetivo_ids) ||
      payload.objetivo_ids.length === 0
    ) {
      throw new HttpException(
        "Lista de objetivos contém duplicidade.",
        HttpStatus.BAD_REQUEST,
      );
    }
    const ids = payload.objetivo_ids.map((id) =>
      positiveInt(id, "Objetivo não encontrado."),
    );
    if (new Set(ids).size !== ids.length) {
      throw new HttpException(
        "Lista de objetivos contém duplicidade.",
        HttpStatus.BAD_REQUEST,
      );
    }

    const goals = await this.prisma.objetivos.findMany({
      where: { id: { in: ids }, usuario_id: user.usuario_id },
    });
    if (goals.length !== ids.length) {
      throw new HttpException(
        "Objetivo não encontrado.",
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.objetivos.update({
          where: { id },
          data: { order_index: index + 1, updated_at: new Date() },
        }),
      ),
    );
    return this.list(user);
  }

  async delete(user: UserRecord, goalId: number): Promise<void> {
    const existing = await this.findOwned(user, goalId);
    await this.prisma.$transaction(async (tx) => {
      await tx.series_recorrencia.updateMany({
        where: {
          objetivo_id: existing.id,
          termination_policy: "ate_objetivo",
        },
        data: { ativo: false },
      });
      await tx.objetivos.delete({ where: { id: existing.id } });
    });
  }

  private async nextOrderIndex(userId: number): Promise<number> {
    const aggregate = await this.prisma.objetivos.aggregate({
      where: { usuario_id: userId },
      _max: { order_index: true },
    });
    return (aggregate._max.order_index ?? 0) + 1;
  }

  private async findOwned(user: UserRecord, goalId: number) {
    const id = positiveInt(goalId, "Objetivo não encontrado.");
    const goal = await this.prisma.objetivos.findFirst({
      where: { id, usuario_id: user.usuario_id },
    });
    if (!goal) {
      throw new HttpException(
        "Objetivo não encontrado.",
        HttpStatus.BAD_REQUEST,
      );
    }
    return goal;
  }
}
