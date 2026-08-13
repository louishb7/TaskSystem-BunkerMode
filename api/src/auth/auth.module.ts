import { Module } from "@nestjs/common"

import { PrismaModule } from "../prisma/prisma.module"
import { AuthController } from "./auth.controller"
import { AuthGuard } from "./auth.guard"
import { AuthRateLimitService } from "./rate-limit.service"
import { AuthService } from "./auth.service"
import { TokenService } from "./token.service"

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthGuard, AuthRateLimitService, AuthService, TokenService],
  exports: [AuthGuard, AuthService],
})
export class AuthModule {}
