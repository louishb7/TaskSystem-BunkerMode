export const STATUS_MISSAO = Object.freeze({
  PENDENTE: "PENDENTE",
  CONCLUIDA: "CONCLUIDA",
  FALHA: "FALHA",
})

const STATUS_LABELS = Object.freeze({
  [STATUS_MISSAO.PENDENTE]: "Pendente",
  [STATUS_MISSAO.CONCLUIDA]: "Concluída",
  [STATUS_MISSAO.FALHA]: "Falha",
})

function getMissionStatusCode(mission) {
  return mission?.status_code || mission?.status || ""
}

export function getStatusLabel(status) {
  return STATUS_LABELS[status] || status
}

export function isOperacional(mission) {
  return isOperationalMission(mission)
}

export function isFinalizada(mission) {
  return isFinalizedMission(mission)
}

export function isRevisavel() {
  return false
}

export function isCompleted(mission) {
  return getMissionStatusCode(mission) === STATUS_MISSAO.CONCLUIDA
}

export function isReviewedFailure(mission) {
  return getMissionStatusCode(mission) === STATUS_MISSAO.FALHA
}

export function isFailedWaitingJustification() {
  return false
}

export function isFailedWaitingReview() {
  return false
}

export function isFinalizedMission(mission) {
  return isCompleted(mission) || isReviewedFailure(mission)
}

export function requiresSoldierJustification() {
  return false
}

export function requiresGeneralReview() {
  return false
}

export function isOperationalMission(mission) {
  return !isFinalizedMission(mission)
}

export function canShowGeneralActions(mission) {
  return Boolean(mission.permissions.can_edit || mission.permissions.can_delete)
}

export function canShowSoldierActions(mission) {
  return mission.permissions.can_complete
}

export function canShowGeneralEdit(mission) {
  return mission.permissions.can_edit
}

export function canShowGeneralDelete(mission) {
  return mission.permissions.can_delete
}
