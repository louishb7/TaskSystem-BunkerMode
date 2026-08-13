import { Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module"
import { CalendarModule } from "../calendar/calendar.module"
import { PrismaModule } from "../prisma/prisma.module"
import { MissionsController } from "./missions.controller"
import { MissionsService } from "./missions.service"

@Module({
  imports: [AuthModule, CalendarModule, PrismaModule],
  controllers: [MissionsController],
  providers: [MissionsService],
  exports: [MissionsService],
})
export class MissionsModule {}
