import { Controller, Get, HttpException, HttpStatus } from "@nestjs/common"
import { Prisma } from "@prisma/client"

import { PrismaService } from "./prisma/prisma.service"

type HealthResponse = {
  status: "ok"
}

type DatabaseHealthResponse = HealthResponse & {
  database: "ok"
}

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("api/v2/health")
  apiHealth(): HealthResponse {
    return { status: "ok" }
  }

  @Get("api/v2/health/database")
  async apiDatabaseHealth(): Promise<DatabaseHealthResponse> {
    try {
      await this.prisma.$queryRaw(Prisma.sql`SELECT 1`)
      return { status: "ok", database: "ok" }
    } catch {
      throw new HttpException(
        { status: "error", database: "unavailable" },
        HttpStatus.SERVICE_UNAVAILABLE,
      )
    }
  }

  @Get("health")
  rootHealth(): HealthResponse {
    return { status: "ok" }
  }
}
