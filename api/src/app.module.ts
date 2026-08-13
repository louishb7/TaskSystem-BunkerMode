import { Module } from "@nestjs/common"

import { AuthModule } from "./auth/auth.module"
import { HealthController } from "./health.controller"
import { MissionsModule } from "./missions/missions.module"

@Module({
  imports: [AuthModule, MissionsModule],
  controllers: [HealthController],
})
export class AppModule {}
