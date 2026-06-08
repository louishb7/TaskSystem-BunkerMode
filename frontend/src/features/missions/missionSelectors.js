import { STATUS_MISSAO, isCompleted } from "../../utils/missionStatus.js"

export function canCompleteInSoldier(mission) {
  return (
    mission?.status_code === STATUS_MISSAO.PENDENTE && mission?.permissions?.can_complete === true
  )
}

export function canJustifyInSoldier(mission) {
  return mission?.permissions?.can_fail === true
}

export function getActionMissions(missions) {
  return missions.filter((mission) => canCompleteInSoldier(mission) || canJustifyInSoldier(mission))
}

export function countCompletedMissions(missions) {
  return missions.filter(isCompleted).length
}
