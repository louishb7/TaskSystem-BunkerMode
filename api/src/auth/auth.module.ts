import { Module } from "@nestjs/common"

import { PrismaModule } from "../prisma/prisma.module"
import { AuthController } from "./auth.controller"
import { AuthGuard } from "./auth.guard"
import { AuthService } from "./auth.service"
import { TokenService } from "./token.service"

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthGuard, AuthService, TokenService],
  exports: [AuthGuard, AuthService],
})
export class AuthModule {}
