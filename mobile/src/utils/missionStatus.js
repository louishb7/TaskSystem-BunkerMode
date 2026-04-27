export const STATUS = {
  PENDENTE: "PENDENTE",
  CONCLUIDA: "CONCLUIDA",
  FALHA_PENDENTE_JUSTIFICATIVA: "FALHA_PENDENTE_JUSTIFICATIVA",
  FALHA_JUSTIFICADA_PENDENTE_REVISAO: "FALHA_JUSTIFICADA_PENDENTE_REVISAO",
  FALHA_REVISADA: "FALHA_REVISADA",
};

function hasStatus(mission) {
  return Boolean(mission && mission.status_code);
}

export function isCompleted(mission) {
  return hasStatus(mission) && mission.status_code === STATUS.CONCLUIDA;
}

export function isFailedWaitingJustification(mission) {
  return hasStatus(mission) && mission.status_code === STATUS.FALHA_PENDENTE_JUSTIFICATIVA;
}

export function isFailedWaitingReview(mission) {
  return hasStatus(mission) && mission.status_code === STATUS.FALHA_JUSTIFICADA_PENDENTE_REVISAO;
}

export function isFinalizedMission(mission) {
  return isCompleted(mission) || (hasStatus(mission) && mission.status_code === STATUS.FALHA_REVISADA);
}

export function isOperationalMission(mission) {
  return hasStatus(mission) && !isFinalizedMission(mission) && !isFailedWaitingReview(mission);
}

export function requiresGeneralReview(mission) {
  return hasStatus(mission) && mission.status_code === STATUS.FALHA_JUSTIFICADA_PENDENTE_REVISAO;
}
