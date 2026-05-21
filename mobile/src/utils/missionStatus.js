export const STATUS = {
  PENDENTE: "PENDENTE",
  CONCLUIDA: "CONCLUIDA",
  FALHA: "FALHA",
  FALHA_PENDENTE_JUSTIFICATIVA: "FALHA_PENDENTE_JUSTIFICATIVA",
  FALHA_JUSTIFICADA_PENDENTE_REVISAO: "FALHA_JUSTIFICADA_PENDENTE_REVISAO",
  FALHA_REVISADA: "FALHA_REVISADA",
};

function hasStatus(mission) {
  return Boolean(mission && mission.status_code);
}

export function isDoneNotMarked(mission) {
  return mission?.failure_reason_type === "done_not_marked";
}

export function isCompleted(mission) {
  return (hasStatus(mission) && mission.status_code === STATUS.CONCLUIDA) || isDoneNotMarked(mission);
}

export function isFailedWaitingJustification(mission) {
  return hasStatus(mission) && mission.status_code === STATUS.FALHA_PENDENTE_JUSTIFICATIVA;
}

export function isFailedWaitingReview(mission) {
  return hasStatus(mission) && mission.status_code === STATUS.FALHA_JUSTIFICADA_PENDENTE_REVISAO;
}

export function isFinalizedMission(mission) {
  return isCompleted(mission) || (hasStatus(mission) && String(mission.status_code).startsWith("FALHA"));
}

export function isOperationalMission(mission) {
  return hasStatus(mission) && !isFinalizedMission(mission) && !isFailedWaitingReview(mission);
}

export function requiresGeneralReview(mission) {
  return false;
}
