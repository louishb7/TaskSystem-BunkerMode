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

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors({
    origin: getAllowedOrigins(),
    credentials: true,
  })
  const port = Number(process.env.PORT ?? 3000)
  const host = process.env.HOST ?? "127.0.0.1"
  await app.listen(port, host)
}

void bootstrap()
