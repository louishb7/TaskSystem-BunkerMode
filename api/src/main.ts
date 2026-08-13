import { NestFactory } from "@nestjs/core"

import { AppModule } from "./app.module"
import { allowedCorsOrigins, validateEnvironment } from "./config/environment"

type ResponseWithSecurityHeaders = {
  setHeader(name: string, value: string): void
}

type NextHandler = () => void

function applySecurityHeaders(_request: unknown, response: ResponseWithSecurityHeaders, next: NextHandler) {
  response.setHeader("X-Content-Type-Options", "nosniff")
  response.setHeader("X-Frame-Options", "DENY")
  response.setHeader("Referrer-Policy", "no-referrer")
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin")
  next()
}

async function bootstrap() {
  validateEnvironment()
  const app = await NestFactory.create(AppModule)
  app.getHttpAdapter().getInstance().disable("x-powered-by")
  app.getHttpAdapter().getInstance().set("trust proxy", process.env.NODE_ENV === "production" ? 1 : false)
  app.use(applySecurityHeaders)
  app.enableShutdownHooks()
  app.enableCors({
    origin: allowedCorsOrigins(),
    credentials: true,
  })
  const port = Number(process.env.PORT ?? 3000)
  const host = process.env.HOST ?? "0.0.0.0"
  await app.listen(port, host)
}

void bootstrap()
