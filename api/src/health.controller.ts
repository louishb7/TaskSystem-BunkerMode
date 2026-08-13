import { Controller, Get } from "@nestjs/common"

type HealthResponse = {
  status: "ok"
}

@Controller()
export class HealthController {
  @Get("api/v2/health")
  apiHealth(): HealthResponse {
    return { status: "ok" }
  }

  @Get("health")
  rootHealth(): HealthResponse {
    return { status: "ok" }
  }
}
