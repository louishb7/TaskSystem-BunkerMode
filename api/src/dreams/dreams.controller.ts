import { Body, Controller, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from "@nestjs/common"

import { AuthGuard } from "../auth/auth.guard"
import { AuthenticatedRequest } from "../auth/auth.types"
import { DreamsService } from "./dreams.service"

@Controller("api/v2")
@UseGuards(AuthGuard)
export class DreamsController {
  constructor(private readonly dreamsService: DreamsService) {}

  @Get("sonhos")
  list(@Req() request: AuthenticatedRequest) {
    return this.dreamsService.list(request.currentUser!)
  }

  @Post("sonhos")
  create(@Req() request: AuthenticatedRequest, @Body() payload: unknown) {
    return this.dreamsService.create(request.currentUser!, payload ?? {})
  }

  @Patch("sonhos/:sonhoId")
  update(@Req() request: AuthenticatedRequest, @Param("sonhoId") sonhoId: string, @Body() payload: unknown) {
    return this.dreamsService.update(request.currentUser!, Number(sonhoId), payload ?? {})
  }

  @Post("sonhos/:sonhoId/arquivar")
  @HttpCode(200)
  archive(@Req() request: AuthenticatedRequest, @Param("sonhoId") sonhoId: string, @Body() payload: unknown) {
    return this.dreamsService.archive(request.currentUser!, Number(sonhoId), payload ?? {})
  }

  @Post("sonhos/:sonhoId/promover")
  @HttpCode(200)
  promote(@Req() request: AuthenticatedRequest, @Param("sonhoId") sonhoId: string) {
    return this.dreamsService.promote(request.currentUser!, Number(sonhoId))
  }
}
