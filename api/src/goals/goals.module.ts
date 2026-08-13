import { Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module"
import { PrismaModule } from "../prisma/prisma.module"
import { GoalsController } from "./goals.controller"
import { GoalsService } from "./goals.service"

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [GoalsController],
  providers: [GoalsService],
  exports: [GoalsService],
})
export class GoalsModule {}
