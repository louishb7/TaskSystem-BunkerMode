import { auditoria_eventos } from "@prisma/client";

import {
  TASK_STATUS,
  TASK_STATUS_LABEL,
  TaskPermissions,
  TaskRecord,
  TaskResponse,
  TaskUser,
} from "./task.types";

function dateOnly(value: Date | null): string | null {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.toISOString().slice(0, 10).split("-");
  return `${day}-${month}-${year}`;
}

function dateTime(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function isPending(task: TaskRecord): boolean {
  return task.status === TASK_STATUS.pending;
}

function isFinalized(task: TaskRecord): boolean {
  return (
    task.status === TASK_STATUS.completed ||
    task.status === TASK_STATUS.failed
  );
}

export function taskPermissions(
  task: TaskRecord,
  user: TaskUser,
): TaskPermissions {
  const owned = task.responsavel_id === user.usuario_id;
  const pending = isPending(task);
  const recurring = task.recurrence_series_id !== null;

  return {
    can_complete: owned && pending,
    can_edit: owned && pending,
    can_delete: owned && pending && !recurring,
    can_fail: owned && pending,
    can_pin: owned && pending,
    can_view_history: owned && isFinalized(task),
  };
}

export function toTaskResponse(
  task: TaskRecord,
  user: TaskUser,
): TaskResponse {
  const status = task.status as keyof typeof TASK_STATUS_LABEL;
  const recurrence = task.serie_recorrencia
    ? {
        series_id: task.serie_recorrencia.recurrence_series_id,
        weekdays: task.serie_recorrencia.recurrence_weekdays,
        termination_policy: task.serie_recorrencia.termination_policy,
        end_date: dateOnly(task.serie_recorrencia.end_date),
      }
    : null;

  return {
    id: task.missao_id,
    titulo: task.titulo,
    prioridade: task.prioridade,
    prazo: dateOnly(task.prazo),
    instrucao: task.instrucao,
    status: task.status as TaskResponse["status"],
    status_code: task.status as TaskResponse["status_code"],
    status_label: TASK_STATUS_LABEL[status] ?? task.status,
    is_pinned: task.is_pinned,
    created_at: task.created_at.toISOString(),
    updated_at: task.updated_at.toISOString(),
    completed_at: dateTime(task.completed_at),
    failed_at: dateTime(task.failed_at),
    user_id: task.responsavel_id,
    criada_por_id: task.criada_por_id,
    responsavel_id: task.responsavel_id,
    objetivo_id: task.objetivo_id,
    recurrence,
    permissions: taskPermissions(task, user),
  };
}

export function toTaskHistoryEventResponse(event: auditoria_eventos) {
  return {
    id: event.evento_id,
    tarefa_id: event.missao_id,
    usuario_id: event.usuario_id,
    acao: event.acao,
    detalhes: event.detalhes,
    criado_em: event.criado_em.toISOString(),
  };
}
