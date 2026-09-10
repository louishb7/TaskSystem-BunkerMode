export const TASK_STATUS = Object.freeze({
  PENDENTE: "PENDENTE",
  CONCLUIDA: "CONCLUIDA",
  NAO_REALIZADA: "NAO_REALIZADA",
})

function getTaskStatusCode(task) {
  return task?.status_code || task?.status || ""
}

export function isCompleted(task) {
  return getTaskStatusCode(task) === TASK_STATUS.CONCLUIDA
}

export function canShowTaskActions(task) {
  return Boolean(task.permissions.can_edit || task.permissions.can_delete)
}

export function canShowFocusActions(task) {
  return task.permissions.can_complete
}

export function canShowTaskEdit(task) {
  return task.permissions.can_edit
}

export function canShowTaskDelete(task) {
  return task.permissions.can_delete
}

export function isNotPerformed(task) {
  return getTaskStatusCode(task) === TASK_STATUS.NAO_REALIZADA
}
