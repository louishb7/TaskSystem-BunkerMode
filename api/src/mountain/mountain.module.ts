import { Module } from "@nestjs/common"

import { AuthModule } from "../auth/auth.module"
import { DreamsModule } from "../dreams/dreams.module"
import { GoalsModule } from "../goals/goals.module"
import { MissionsModule } from "../missions/missions.module"
import { MountainController } from "./mountain.controller"
import { MountainService } from "./mountain.service"

@Module({
  imports: [AuthModule, DreamsModule, GoalsModule, MissionsModule],
  controllers: [MountainController],
  providers: [MountainService],
})
export class MountainModule {}
