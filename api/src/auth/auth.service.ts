import { HttpException, HttpStatus, Injectable } from "@nestjs/common"
import { Prisma } from "@prisma/client"

import { PrismaService } from "../prisma/prisma.service"
import { UserRecord } from "./auth.types"
import { hashPassword, verifyPassword } from "./password"
import { TokenService } from "./token.service"

type RegisterPayload = {
  usuario?: unknown
  email?: unknown
  senha?: unknown
}

type LoginPayload = {
  email?: unknown
  senha?: unknown
}

type ModePayload = {
  mode?: unknown
}

function requireText(value: unknown, message: string): string {
  if (typeof value !== "string") {
    throw new HttpException(message, HttpStatus.BAD_REQUEST)
  }
  const normalized = value.trim()
  if (!normalized) {
    throw new HttpException(message, HttpStatus.BAD_REQUEST)
  }
  return normalized
}

function normalizeEmail(value: unknown): string {
  const email = requireText(value, "E-mail inválido.").toLowerCase()
  if (email.length < 5 || !email.includes("@") || email.startsWith("@") || email.endsWith("@") || email.includes(" ")) {
    throw new HttpException("E-mail inválido.", HttpStatus.BAD_REQUEST)
  }
  return email
}

function normalizeUsername(value: unknown): string {
  const usuario = requireText(value, "Usuário deve ter pelo menos 3 caracteres.").toLowerCase()
  if (usuario.length < 3) {
    throw new HttpException("Usuário deve ter pelo menos 3 caracteres.", HttpStatus.BAD_REQUEST)
  }
  if (!/^[a-z0-9._-]+$/.test(usuario)) {
    throw new HttpException("Usuário deve usar apenas letras, números, ponto, hífen ou sublinhado.", HttpStatus.BAD_REQUEST)
  }
  return usuario
}

function normalizePassword(value: unknown, status = HttpStatus.BAD_REQUEST): string {
  if (typeof value !== "string" || value.length < 8) {
    throw new HttpException("Senha deve ter pelo menos 8 caracteres.", status)
  }
  return value
}

function normalizeMode(value: unknown): "general" | "soldier" {
  const mode = requireText(value, "Modo ativo inválido.").toLowerCase()
  if (mode !== "general" && mode !== "soldier") {
    throw new HttpException("Modo ativo inválido.", HttpStatus.BAD_REQUEST)
  }
  return mode
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async register(payload: RegisterPayload): Promise<UserRecord> {
    const usuario = normalizeUsername(payload.usuario)
    const email = normalizeEmail(payload.email)
    const senha = normalizePassword(payload.senha)

    try {
      return await this.prisma.usuarios.create({
        data: {
          usuario,
          email,
          senha_hash: hashPassword(senha),
        },
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new HttpException("E-mail ou usuário já está em uso.", HttpStatus.BAD_REQUEST)
      }
      throw error
    }
  }

  async login(payload: LoginPayload): Promise<{ access_token: string; token_type: "bearer"; usuario: UserRecord }> {
    const identificador = requireText(payload.email, "Credenciais inválidas.")
    const senha = normalizePassword(payload.senha, HttpStatus.UNAUTHORIZED)
    const email = identificador.toLowerCase()
    const usuarioLogin = identificador.toLowerCase()

    const usuario = identificador.includes("@")
      ? await this.prisma.usuarios.findUnique({ where: { email } })
      : await this.prisma.usuarios.findUnique({ where: { usuario: usuarioLogin } })

    if (!usuario || !verifyPassword(senha, usuario.senha_hash)) {
      throw new HttpException("Credenciais inválidas.", HttpStatus.UNAUTHORIZED)
    }
    if (!usuario.ativo) {
      throw new HttpException("Usuário inativo.", HttpStatus.UNAUTHORIZED)
    }

    return {
      access_token: this.tokenService.generate({ sub: usuario.usuario_id, email: usuario.email }),
      token_type: "bearer",
      usuario,
    }
  }

  async getUserFromToken(token: string): Promise<UserRecord> {
    const payload = this.tokenService.decode(token)
    const usuario = await this.prisma.usuarios.findUnique({ where: { usuario_id: payload.sub } })
    if (!usuario) {
      throw new HttpException("Usuário autenticado não encontrado.", HttpStatus.UNAUTHORIZED)
    }
    if (!usuario.ativo) {
      throw new HttpException("Usuário inativo.", HttpStatus.UNAUTHORIZED)
    }
    return usuario
  }

  async setGeneralName(usuarioId: number, nomeGeneral: unknown): Promise<UserRecord> {
    const usuario = await this.getUserById(usuarioId)
    if (usuario.active_mode !== "general") {
      throw new HttpException("Identidade do General só pode ser alterada no modo General.", HttpStatus.FORBIDDEN)
    }

    const nome = requireText(nomeGeneral, "Nome do General é obrigatório.")
    return this.prisma.usuarios.update({
      where: { usuario_id: usuarioId },
      data: { nome_general: nome },
    })
  }

  async setMode(usuarioId: number, payload: ModePayload): Promise<UserRecord> {
    const mode = normalizeMode(payload.mode)
    await this.getUserById(usuarioId)
    return this.prisma.usuarios.update({
      where: { usuario_id: usuarioId },
      data: { active_mode: mode },
    })
  }

  private async getUserById(usuarioId: number): Promise<UserRecord> {
    const usuario = await this.prisma.usuarios.findUnique({ where: { usuario_id: usuarioId } })
    if (!usuario) {
      throw new HttpException("Usuário autenticado não encontrado.", HttpStatus.BAD_REQUEST)
    }
    return usuario
  }
}
