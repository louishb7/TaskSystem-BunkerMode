import { PrismaService } from "../src/prisma/prisma.service"

describe("PrismaService", () => {
  const originalDatabaseUrl = process.env.DATABASE_URL

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL
      return
    }

    process.env.DATABASE_URL = originalDatabaseUrl
  })

  it("requires DATABASE_URL at runtime", () => {
    delete process.env.DATABASE_URL

    expect(() => new PrismaService()).toThrow("Defina DATABASE_URL antes de executar o BunkerMode.")
  })

  it("instantiates Prisma Client with the PostgreSQL adapter", async () => {
    process.env.DATABASE_URL = "postgresql://usuario:senha@127.0.0.1:5432/bunkermode"

    const service = new PrismaService()

    expect(typeof service.$disconnect).toBe("function")
    await service.$disconnect()
  })
})
