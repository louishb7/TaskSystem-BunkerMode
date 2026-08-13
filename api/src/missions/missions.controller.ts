import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common"

import { AuthenticatedRequest } from "../auth/auth.types"
import { AuthGuard } from "../auth/auth.guard"
import { MissionsService } from "./missions.service"
import { toMissionResponse } from "./mission-response"

@Controller("api/v2")
@UseGuards(AuthGuard)
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  @Get("missoes")
  async listMissions(@Req() request: AuthenticatedRequest) {
    const user = request.currentUser!
    const missions = await this.missionsService.listForGeneralBoard(user)
    return missions.map((mission) => toMissionResponse(mission, user))
  }

  @Get("missoes/operacionais")
  async listOperationalMissions(@Req() request: AuthenticatedRequest) {
    return this.listMissions(request)
  }

  @Post("missoes")
  async createMission(@Req() request: AuthenticatedRequest, @Body() payload: unknown) {
    const user = request.currentUser!
    const mission = await this.missionsService.create(payload ?? {}, user)
    return toMissionResponse(mission, user)
  }
}
