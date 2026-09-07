import { Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module"
import { CalendarModule } from "../calendar/calendar.module"
import { PrismaModule } from "../prisma/prisma.module"
import { TasksController } from "./tasks.controller"
import { TasksService } from "./tasks.service"

@Module({
  imports: [AuthModule, CalendarModule, PrismaModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
