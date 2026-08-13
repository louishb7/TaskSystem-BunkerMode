import { Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module"
import { CalendarModule } from "../calendar/calendar.module"
import { MissionsModule } from "../missions/missions.module"
import { PrismaModule } from "../prisma/prisma.module"
import { ReviewsController } from "./reviews.controller"
import { ReviewsService } from "./reviews.service"

@Module({
  imports: [AuthModule, CalendarModule, MissionsModule, PrismaModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
