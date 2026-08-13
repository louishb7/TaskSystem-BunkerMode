import { Controller, Get, Req, UseGuards } from "@nestjs/common"

import { AuthGuard } from "../auth/auth.guard"
import { AuthenticatedRequest } from "../auth/auth.types"
import { MountainService } from "./mountain.service"

@Controller("api/v2")
@UseGuards(AuthGuard)
export class MountainController {
  constructor(private readonly mountainService: MountainService) {}

  @Get("montanha")
  getMountain(@Req() request: AuthenticatedRequest) {
    return this.mountainService.getMountain(request.currentUser!)
  }
}
