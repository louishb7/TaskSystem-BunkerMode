import { Module } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module";
import { GoalsModule } from "./goals/goals.module";
import { HealthController } from "./health.controller";
import { MissionsModule } from "./missions/missions.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [AuthModule, GoalsModule, MissionsModule, PrismaModule],
  controllers: [HealthController],
})
export class AppModule {}
