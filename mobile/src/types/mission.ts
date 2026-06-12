export type MissionPermissions = {
  can_complete: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_justify: boolean;
  can_fail: boolean;
  can_review: boolean;
  can_view_history: boolean;
};

export type Mission = {
  id: number;
  titulo: string;
  instrucao?: string | null;
  prioridade?: string | null;
  prazo?: string | null;
  status_code: string;
  status_label: string;
  is_pinned?: boolean;
  failure_reason?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
  failed_at?: string | null;
  responsavel_id?: number | null;
  objetivo_id?: number | null;
  sonho_id?: number | null;
  permissions: MissionPermissions;
};

export type SoldierBoard = {
  missions: Mission[];
  daily_missions: Mission[];
  turn?: {
    active_date_label?: string | null;
    requires_decision?: boolean;
  } | null;
};

export type CreateMissionPayload = {
  titulo: string;
  instrucao?: string;
  prazo?: string | null;
  responsavel_id?: number;
  objetivo_id?: number | null;
  sonho_id?: number | null;
  recurrence_weekdays?: number[] | null;
  duration_type?: string | null;
  recurrence_end_date?: string | null;
};
