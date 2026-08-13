import { NestFactory } from "@nestjs/core"

import { AppModule } from "./app.module"

const LOCAL_CORS_ORIGINS = [
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://localhost:3000",
]

function getAllowedOrigins(): string[] {
  const configuredOrigins = process.env.BUNKERMODE_CORS_ALLOW_ORIGINS?.trim()
  if (!configuredOrigins) {
    return LOCAL_CORS_ORIGINS
  }
  return configuredOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
}

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
  const app = await NestFactory.create(AppModule)
  app.getHttpAdapter().getInstance().disable("x-powered-by")
  app.use(applySecurityHeaders)
  app.enableCors({
    origin: getAllowedOrigins(),
    credentials: true,
  })
  const port = Number(process.env.PORT ?? 3000)
  const host = process.env.HOST ?? "127.0.0.1"
  await app.listen(port, host)
}

void bootstrap()
