import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from "@nestjs/common"

import { AuthenticatedRequest } from "../auth/auth.types"
import { AuthGuard } from "../auth/auth.guard"
import { MissionsService } from "./missions.service"
import { toMissionResponse } from "./mission-response"

function missionId(value: string): number {
  const id = Number(value)
  if (!Number.isInteger(id) || id < 1) {
    return 0
  }
  return id
}

@Controller("api/v2")
@UseGuards(AuthGuard)
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  @Get("missoes")
  async listMissions(@Req() request: AuthenticatedRequest) {
    const user = request.currentUser!
    if (user.active_mode === "soldier") {
      const board = await this.missionsService.soldierBoard(user)
      return board.action_missions.map((mission) => toMissionResponse(mission, user))
    }
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

  @Get("missoes/dia-operacional")
  async listDailyMissions(@Req() request: AuthenticatedRequest) {
    const user = request.currentUser!
    const missions = await this.missionsService.listDailyOperational(user)
    return missions.map((mission) => toMissionResponse(mission, user))
  }

  @Get("missoes/turno-operacional")
  async operationalTurn(@Req() request: AuthenticatedRequest) {
    return this.missionsService.operationalTurn(request.currentUser!)
  }

  @Get("missoes/quadro-soldado")
  async soldierBoard(@Req() request: AuthenticatedRequest) {
    const user = request.currentUser!
    const board = await this.missionsService.soldierBoard(user)
    return {
      turn: board.turn,
      missions: board.action_missions.map((mission) => toMissionResponse(mission, user)),
      daily_missions: board.daily_missions.map((mission) => toMissionResponse(mission, user)),
    }
  }

  @Post("missoes/turno-operacional/encerrar-pendencias")
  @HttpCode(200)
  async closePreviousOperationalTurn(@Req() request: AuthenticatedRequest) {
    return this.missionsService.closePreviousOperationalTurn(request.currentUser!)
  }

  @Get("missoes/revisao")
  async listReviewMissions(@Req() request: AuthenticatedRequest) {
    const user = request.currentUser!
    const missions = await this.missionsService.listForReview(user)
    return missions.map((mission) => toMissionResponse(mission, user))
  }

  @Get("missoes/historico")
  async listHistoricalMissions(@Req() request: AuthenticatedRequest) {
    const user = request.currentUser!
    const missions = await this.missionsService.listHistorical(user)
    return missions.map((mission) => toMissionResponse(mission, user))
  }

  @Patch("missoes/:id")
  async updateMission(@Req() request: AuthenticatedRequest, @Param("id") id: string, @Body() payload: unknown) {
    const user = request.currentUser!
    const mission = await this.missionsService.update(missionId(id), payload ?? {}, user)
    return toMissionResponse(mission, user)
  }

  @Patch("missoes/:id/concluir")
  async completeMission(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    const user = request.currentUser!
    const mission = await this.missionsService.complete(missionId(id), user)
    return toMissionResponse(mission, user)
  }

  @Post("missoes/:id/falhar")
  @HttpCode(200)
  async failMission(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    const user = request.currentUser!
    const mission = await this.missionsService.fail(missionId(id), user)
    return toMissionResponse(mission, user)
  }

  @Patch("missoes/:id/toggle-pin")
  async togglePin(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    const user = request.currentUser!
    const mission = await this.missionsService.togglePin(missionId(id), user)
    return toMissionResponse(mission, user)
  }

  @Post("missoes/:id/justification")
  @HttpCode(200)
  async failureJustification(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.failMission(request, id)
  }

  @Post("missoes/:id/justificar")
  @HttpCode(200)
  async justifyMission(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    return this.failMission(request, id)
  }

  @Post("missoes/:id/revisar")
  @HttpCode(200)
  async reviewMission(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    const user = request.currentUser!
    const mission = await this.missionsService.review(missionId(id), user)
    return toMissionResponse(mission, user)
  }

  @Delete("missoes/:id")
  @HttpCode(204)
  async deleteMission(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    await this.missionsService.delete(missionId(id), request.currentUser!)
  }

  @Get("missoes/:id/historico")
  async missionHistory(@Req() request: AuthenticatedRequest, @Param("id") id: string) {
    const events = await this.missionsService.missionHistory(missionId(id), request.currentUser!)
    return events.map((event) => ({
      id: event.evento_id,
      missao_id: event.missao_id,
      usuario_id: event.usuario_id,
      acao: event.acao,
      detalhes: event.detalhes,
      criado_em: event.criado_em.toISOString(),
    }))
  }
}
