import { HttpException } from "@nestjs/common"

import { AuthService } from "../src/auth/auth.service"
import { hashPassword, verifyPassword } from "../src/auth/password"
import { TokenService } from "../src/auth/token.service"
import { toUserResponse } from "../src/auth/user-response"
import { PrismaService } from "../src/prisma/prisma.service"

type UserRecord = Awaited<ReturnType<AuthService["register"]>>

function user(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    usuario_id: 1,
    usuario: "general",
    email: "general@bunker.local",
    senha_hash: hashPassword("senha123"),
    ativo: true,
    nome_general: null,
    active_mode: "general",
    timezone: "America/Recife",
    created_at: new Date("2026-04-24T12:00:00.000Z"),
    updated_at: new Date("2026-04-24T12:00:00.000Z"),
    ...overrides,
  }
}

function prismaMock() {
  return {
    usuarios: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  }
}

describe("Auth phase 3", () => {
  beforeEach(() => {
    process.env.BUNKERMODE_AUTH_SECRET = "fase-3-test-secret"
  })

  it("uses the current scrypt password hash format", () => {
    const passwordHash = hashPassword("senha1234")

    expect(passwordHash).toMatch(/^scrypt\$16384\$8\$1\$[0-9a-f]{32}\$[0-9a-f]{128}$/)
    expect(verifyPassword("senha1234", passwordHash)).toBe(true)
    expect(verifyPassword("errada", passwordHash)).toBe(false)
  })

  it("registers a user with normalized email and default database fields", async () => {
    const prisma = prismaMock()
    const createdUser = user({ email: "general@bunker.local" })
    prisma.usuarios.create.mockResolvedValue(createdUser)
    const service = new AuthService(prisma as unknown as PrismaService, new TokenService())

    const result = await service.register({
      usuario: " general ",
      email: " General@Bunker.Local ",
      senha: "senha123",
    })

    expect(result).toBe(createdUser)
    expect(prisma.usuarios.create).toHaveBeenCalledWith({
      data: {
        usuario: "general",
        email: "general@bunker.local",
        senha_hash: expect.stringMatching(/^scrypt\$16384\$8\$1\$/),
      },
    })
  })

  it("logs in by email or username and omits ativo from login user response", async () => {
    const prisma = prismaMock()
    const existingUser = user()
    prisma.usuarios.findUnique.mockResolvedValue(existingUser)
    const service = new AuthService(prisma as unknown as PrismaService, new TokenService())

    const result = await service.login({ email: "GENERAL", senha: "senha123" })

    expect(result.token_type).toBe("bearer")
    expect(result.access_token.split(".")).toHaveLength(3)
    expect(toUserResponse(result.usuario, false)).not.toHaveProperty("ativo")
    expect(prisma.usuarios.findUnique).toHaveBeenCalledWith({
      where: { usuario: "general" },
    })
  })

  it("rejects inactive users from existing tokens", async () => {
    const prisma = prismaMock()
    prisma.usuarios.findUnique.mockResolvedValue(user({ ativo: false }))
    const service = new AuthService(prisma as unknown as PrismaService, new TokenService())
    const token = new TokenService().generate({ sub: 1, email: "general@bunker.local" })

    await expect(service.getUserFromToken(token)).rejects.toMatchObject({ status: 401 })
  })

  it("rejects invalid credentials with 401", async () => {
    const prisma = prismaMock()
    prisma.usuarios.findUnique.mockResolvedValue(user())
    const service = new AuthService(prisma as unknown as PrismaService, new TokenService())

    await expect(service.login({ email: "general@bunker.local", senha: "errada123" })).rejects.toMatchObject({
      status: 401,
    })
  })

  it("updates active mode and General name with current contract fields", async () => {
    const prisma = prismaMock()
    prisma.usuarios.findUnique.mockResolvedValue(user())
    prisma.usuarios.update.mockResolvedValue(user({ active_mode: "soldier", nome_general: "Ares" }))
    const service = new AuthService(prisma as unknown as PrismaService, new TokenService())

    await service.setMode(1, { mode: " soldier " })
    await service.setGeneralName(1, " Ares ")

    expect(prisma.usuarios.update).toHaveBeenNthCalledWith(1, {
      where: { usuario_id: 1 },
      data: { active_mode: "soldier" },
    })
    expect(prisma.usuarios.update).toHaveBeenNthCalledWith(2, {
      where: { usuario_id: 1 },
      data: { nome_general: "Ares" },
    })
  })

  it("keeps General name changes restricted to General mode", async () => {
    const prisma = prismaMock()
    prisma.usuarios.findUnique.mockResolvedValue(user({ active_mode: "soldier" }))
    const service = new AuthService(prisma as unknown as PrismaService, new TokenService())

    await expect(service.setGeneralName(1, "Ares")).rejects.toBeInstanceOf(HttpException)
    await expect(service.setGeneralName(1, "Ares")).rejects.toMatchObject({ status: 403 })
  })
})
