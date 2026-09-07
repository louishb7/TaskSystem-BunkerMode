import { STATUS_MISSAO, isCompleted } from "../../utils/missionStatus"

export function canCompleteInFocus(mission) {
  return (
    mission?.status_code === STATUS_MISSAO.PENDENTE && mission?.permissions?.can_complete === true
  )
}

export function canFailInFocus(mission) {
  return mission?.permissions?.can_fail === true
}

export function getActionMissions(missions) {
  return missions.filter((mission) => canCompleteInFocus(mission) || canFailInFocus(mission))
}

export function countCompletedMissions(missions) {
  return missions.filter(isCompleted).length
}
