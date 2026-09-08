import { UserRecord } from "../auth/auth.types";

export const TASK_STATUS = {
  pending: "PENDENTE",
  completed: "CONCLUIDA",
  failed: "FALHA",
} as const;

export const TASK_STATUS_LABEL = {
  [TASK_STATUS.pending]: "Pendente",
  [TASK_STATUS.completed]: "Concluída",
  [TASK_STATUS.failed]: "Falha",
} as const;

export const TASK_INSTRUCTION_MAX_LENGTH = 280;
export const DEFAULT_PRIORITY = 2;

export type TaskStatus =
  (typeof TASK_STATUS)[keyof typeof TASK_STATUS];

export type RecurrenceSeriesRecord = {
  recurrence_series_id: number;
  recurrence_weekdays: number[];
  termination_policy: string;
  end_date: Date | null;
};

export type TaskRecord = {
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
  serie_recorrencia?: RecurrenceSeriesRecord | null;
  criada_por_id: number;
  responsavel_id: number;
  objetivo_id: number | null;
};

export type TaskUser = Pick<UserRecord, "usuario_id">;

export function canReopenTask(task: TaskRecord, user: TaskUser): boolean {
  return task.responsavel_id === user.usuario_id &&
    (task.status === TASK_STATUS.completed || task.status === TASK_STATUS.failed);
}

export type TaskPermissions = {
  can_complete: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_fail: boolean;
  can_pin: boolean;
  can_view_history: boolean;
  can_reopen: boolean;
};

export type TaskResponse = {
  id: number;
  titulo: string;
  prioridade: number;
  prazo: string | null;
  instrucao: string | null;
  status: TaskStatus;
  status_code: TaskStatus;
  status_label: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  failed_at: string | null;
  user_id: number;
  criada_por_id: number;
  responsavel_id: number;
  objetivo_id: number | null;
  recurrence: {
    series_id: number;
    weekdays: number[];
    termination_policy: string;
    end_date: string | null;
  } | null;
  permissions: TaskPermissions;
};
