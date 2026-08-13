import { Body, Controller, Get, HttpCode, Patch, Post, Req, UseGuards } from "@nestjs/common"

import { AuthenticatedRequest } from "./auth.types"
import { AuthGuard } from "./auth.guard"
import { AuthRateLimitService } from "./rate-limit.service"
import { AuthService } from "./auth.service"
import { toUserResponse } from "./user-response"

type RequestLike = {
  ip?: string
  socket?: { remoteAddress?: string }
  headers?: Record<string, string | string[] | undefined>
}

function clientAddress(request: RequestLike): string {
  const forwardedFor = request.headers?.["x-forwarded-for"]
  const headerValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor
  return headerValue?.split(",")[0]?.trim() || request.ip || request.socket?.remoteAddress || "unknown"
}

@Controller("api/v2")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly rateLimit: AuthRateLimitService,
  ) {}

  @Post("auth/register")
  async register(@Req() request: RequestLike, @Body() payload: unknown) {
    this.rateLimit.check(`register:${clientAddress(request)}`, 5, 60_000)
    const usuario = await this.authService.register(payload ?? {})
    return toUserResponse(usuario)
  }

  @Post("auth/login")
  @HttpCode(200)
  async login(@Req() request: RequestLike, @Body() payload: unknown) {
    this.rateLimit.check(`login:${clientAddress(request)}`, 10, 60_000)
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
