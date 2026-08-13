const LOCAL_CORS_ORIGINS = [
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://localhost:3000",
]

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Defina ${name} antes de iniciar o BunkerMode.`)
  }
  return value
}

export function validateEnvironment(): void {
  required("DATABASE_URL")
  required("BUNKERMODE_AUTH_SECRET")

  const isProduction = process.env.NODE_ENV === "production"
  if (isProduction) {
    const cors = required("BUNKERMODE_CORS_ALLOW_ORIGINS")
    if (cors.includes("localhost") || cors.includes("127.0.0.1")) {
      throw new Error("BUNKERMODE_CORS_ALLOW_ORIGINS de produção não deve apontar para localhost.")
    }
  }
}

export function allowedCorsOrigins(): string[] {
  const configuredOrigins = process.env.BUNKERMODE_CORS_ALLOW_ORIGINS?.trim()
  if (!configuredOrigins) {
    return LOCAL_CORS_ORIGINS
  }
  return configuredOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
}
