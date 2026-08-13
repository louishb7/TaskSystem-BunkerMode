import { Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module"
import { PrismaModule } from "../prisma/prisma.module"
import { DreamsController } from "./dreams.controller"
import { DreamsService } from "./dreams.service"

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [DreamsController],
  providers: [DreamsService],
  exports: [DreamsService],
})
export class DreamsModule {}
