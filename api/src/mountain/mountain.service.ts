import { Injectable } from "@nestjs/common"

import { UserRecord } from "../auth/auth.types"
import { ensureGeneral } from "../common/domain-helpers"
import { DreamsService } from "../dreams/dreams.service"
import { GoalsService } from "../goals/goals.service"
import { toMissionResponse } from "../missions/mission-response"
import { MissionsService } from "../missions/missions.service"

@Injectable()
export class MountainService {
  constructor(
    private readonly dreamsService: DreamsService,
    private readonly goalsService: GoalsService,
    private readonly missionsService: MissionsService,
  ) {}

  async getMountain(user: UserRecord) {
    ensureGeneral(user)
    const [sonhos, objetivos, missions] = await Promise.all([
      this.dreamsService.list(user),
      this.goalsService.list(user),
      this.missionsService.listAllForUser(user),
    ])
    const missionResponses = missions.map((mission) => toMissionResponse(mission, user))
    return {
      sonhos,
      objetivos,
      missions: missionResponses,
      daily_missions: missionResponses,
    }
  }
}
