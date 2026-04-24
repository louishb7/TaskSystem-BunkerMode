import { isMissionOverdue } from "./date.js";

export const STATUS_MISSAO = Object.freeze({
  PENDENTE: "Pendente",
  CONCLUIDA: "Concluída",
  FALHADA: "Falha aguardando justificativa",
  JUSTIFICADA: "Falha justificada aguardando revisão",
  FALHA_REVISADA: "Falha revisada",
});

export function getStatusLabel(status) {
  return (
    {
      [STATUS_MISSAO.PENDENTE]: STATUS_MISSAO.PENDENTE,
      [STATUS_MISSAO.CONCLUIDA]: STATUS_MISSAO.CONCLUIDA,
      [STATUS_MISSAO.FALHADA]: STATUS_MISSAO.FALHADA,
      [STATUS_MISSAO.JUSTIFICADA]: STATUS_MISSAO.JUSTIFICADA,
      [STATUS_MISSAO.FALHA_REVISADA]: STATUS_MISSAO.FALHA_REVISADA,
    }[status] || status
  );
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
  return mission?.status === STATUS_MISSAO.CONCLUIDA;
}

export function isReviewedFailure(mission) {
  return mission?.status === STATUS_MISSAO.FALHA_REVISADA;
}

export function isFailedWaitingJustification(mission) {
  return mission?.status === STATUS_MISSAO.FALHADA;
}

export function isFailedWaitingReview(mission) {
  return mission?.status === STATUS_MISSAO.JUSTIFICADA;
}

export function isFinalizedMission(mission) {
  return isCompleted(mission) || isReviewedFailure(mission);
}

export function requiresSoldierJustification(mission) {
  return (
    isFailedWaitingJustification(mission) ||
    ((Boolean(mission?.failed_at) || isMissionOverdue(mission?.prazo)) &&
      !mission?.failure_reason &&
      !isCompleted(mission))
  );
}

export function requiresGeneralReview(mission) {
  return isFailedWaitingReview(mission);
}

export function isOperationalMission(mission) {
  return !isFinalizedMission(mission) && !requiresGeneralReview(mission);
}

export function canShowGeneralActions(mission) {
  return (
    mission?.status === STATUS_MISSAO.PENDENTE ||
    mission?.status === STATUS_MISSAO.CONCLUIDA ||
    mission?.status === STATUS_MISSAO.FALHADA
  );
}

export function canShowSoldierActions(mission) {
  return mission?.status === STATUS_MISSAO.PENDENTE;
}

export function canShowGeneralEdit(mission) {
  return canShowGeneralActions(mission);
}

export function canShowGeneralDecisionToggle(mission) {
  return mission?.status === STATUS_MISSAO.PENDENTE;
}

export function canShowGeneralDelete(mission) {
  return isOperationalMission(mission);
}
