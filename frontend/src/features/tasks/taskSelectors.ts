import { TASK_STATUS, isCompleted } from "../../utils/taskStatus"

export function canCompleteInFocus(task) {
  return task?.status_code === TASK_STATUS.PENDENTE && task?.permissions?.can_complete === true
}

export function canFailInFocus(task) {
  return task?.permissions?.can_fail === true
}

export function getActionTasks(tasks) {
  return tasks.filter((task) => canCompleteInFocus(task) || canFailInFocus(task))
}

export function countCompletedTasks(tasks) {
  return tasks.filter(isCompleted).length
}
