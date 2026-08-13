import { Body, Controller, Get, HttpCode, Patch, Post, Req, UseGuards } from "@nestjs/common"

import { AuthenticatedRequest } from "./auth.types"
import { AuthGuard } from "./auth.guard"
import { AuthService } from "./auth.service"
import { toUserResponse } from "./user-response"

@Controller("api/v2")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("auth/register")
  async register(@Body() payload: unknown) {
    const usuario = await this.authService.register(payload ?? {})
    return toUserResponse(usuario)
  }

  @Post("auth/login")
  @HttpCode(200)
  async login(@Body() payload: unknown) {
    const result = await this.authService.login(payload ?? {})
    return {
      access_token: result.access_token,
      token_type: result.token_type,
      usuario: toUserResponse(result.usuario, false),
    }
  }

  @Get("usuarios/me")
  @UseGuards(AuthGuard)
  currentUser(@Req() request: AuthenticatedRequest) {
    return toUserResponse(request.currentUser!)
  }

  @Patch("usuarios/me/nome-general")
  @UseGuards(AuthGuard)
  async setGeneralName(@Req() request: AuthenticatedRequest, @Body() payload: { nome_general?: unknown }) {
    const usuario = await this.authService.setGeneralName(request.currentUser!.usuario_id, payload?.nome_general)
    return toUserResponse(usuario)
  }

  @Patch("session/mode")
  @UseGuards(AuthGuard)
  async setSessionMode(@Req() request: AuthenticatedRequest, @Body() payload: unknown) {
    const usuario = await this.authService.setMode(request.currentUser!.usuario_id, payload ?? {})
    return toUserResponse(usuario)
  }
}
