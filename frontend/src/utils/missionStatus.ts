export const STATUS_MISSAO = Object.freeze({
  PENDENTE: "PENDENTE",
  CONCLUIDA: "CONCLUIDA",
  FALHA: "FALHA",
})

function getMissionStatusCode(mission) {
  return mission?.status_code || mission?.status || ""
}

export function isCompleted(mission) {
  return getMissionStatusCode(mission) === STATUS_MISSAO.CONCLUIDA
}

export function canShowTaskActions(mission) {
  return Boolean(mission.permissions.can_edit || mission.permissions.can_delete)
}

export function canShowFocusActions(mission) {
  return mission.permissions.can_complete
}

export function canShowTaskEdit(mission) {
  return mission.permissions.can_edit
}

export function canShowTaskDelete(mission) {
  return mission.permissions.can_delete
}
