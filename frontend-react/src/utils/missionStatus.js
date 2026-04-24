export const STATUS_MISSAO = Object.freeze({
  PENDENTE: "PENDENTE",
  CONCLUIDA: "CONCLUIDA",
  FALHA_PENDENTE_JUSTIFICATIVA: "FALHA_PENDENTE_JUSTIFICATIVA",
  FALHA_JUSTIFICADA_PENDENTE_REVISAO: "FALHA_JUSTIFICADA_PENDENTE_REVISAO",
  FALHA_REVISADA: "FALHA_REVISADA",
});

const STATUS_LABELS = Object.freeze({
  [STATUS_MISSAO.PENDENTE]: "Pendente",
  [STATUS_MISSAO.CONCLUIDA]: "Concluída",
  [STATUS_MISSAO.FALHA_PENDENTE_JUSTIFICATIVA]: "Falha aguardando justificativa",
  [STATUS_MISSAO.FALHA_JUSTIFICADA_PENDENTE_REVISAO]: "Falha justificada aguardando revisão",
  [STATUS_MISSAO.FALHA_REVISADA]: "Falha revisada",
});

function getMissionStatusCode(mission) {
  return mission?.status_code || "";
}

export function getStatusLabel(status) {
  return STATUS_LABELS[status] || status;
}

export function isOperacional(mission) {
  return isOperationalMission(mission);
}

export function isFinalizada(mission) {
  return isFinalizedMission(mission);
}

export function isRevisavel(mission) {
  return requiresGeneralReview(mission);
}

export function isCompleted(mission) {
  return getMissionStatusCode(mission) === STATUS_MISSAO.CONCLUIDA;
}

export function isReviewedFailure(mission) {
  return getMissionStatusCode(mission) === STATUS_MISSAO.FALHA_REVISADA;
}

export function isFailedWaitingJustification(mission) {
  return getMissionStatusCode(mission) === STATUS_MISSAO.FALHA_PENDENTE_JUSTIFICATIVA;
}

export function isFailedWaitingReview(mission) {
  return getMissionStatusCode(mission) === STATUS_MISSAO.FALHA_JUSTIFICADA_PENDENTE_REVISAO;
}

export function isFinalizedMission(mission) {
  return isCompleted(mission) || isReviewedFailure(mission);
}

export function requiresSoldierJustification(mission) {
  return isFailedWaitingJustification(mission);
}

export function requiresGeneralReview(mission) {
  return isFailedWaitingReview(mission);
}

export function isOperationalMission(mission) {
  return !isFinalizedMission(mission) && !requiresGeneralReview(mission);
}

export function canShowGeneralActions(mission) {
  return Boolean(
    mission.permissions.can_edit ||
    mission.permissions.can_delete ||
    mission.permissions.can_toggle_decided
  );
}

export function canShowSoldierActions(mission) {
  return mission.permissions.can_complete;
}

export function canShowGeneralEdit(mission) {
  return mission.permissions.can_edit;
}

export function canShowGeneralDecisionToggle(mission) {
  return mission.permissions.can_toggle_decided;
}

export function canShowGeneralDelete(mission) {
  return mission.permissions.can_delete;
}
