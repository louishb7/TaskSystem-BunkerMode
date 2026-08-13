import { Module } from "@nestjs/common"

import { AuthModule } from "./auth/auth.module"
import { DreamsModule } from "./dreams/dreams.module"
import { GoalsModule } from "./goals/goals.module"
import { HealthController } from "./health.controller"
import { MissionsModule } from "./missions/missions.module"
import { MountainModule } from "./mountain/mountain.module"
import { ReviewsModule } from "./reviews/reviews.module"

@Module({
  imports: [AuthModule, DreamsModule, GoalsModule, MissionsModule, MountainModule, ReviewsModule],
  controllers: [HealthController],
})
export class AppModule {}
