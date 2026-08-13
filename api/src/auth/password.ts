import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto"

const ITERATIONS = 100_000
const KEY_LENGTH = 32
const DIGEST = "sha256"

export function hashPassword(password: string): string {
  if (typeof password !== "string" || password.length < 6) {
    throw new Error("Senha deve ter pelo menos 6 caracteres.")
  }

  const salt = randomBytes(16).toString("hex")
  const digest = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("hex")
  return `${salt}$${digest}`
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  const [salt, digest] = passwordHash.split("$", 2)
  if (!salt || !digest) {
    return false
  }

  const current = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)
  const expected = Buffer.from(digest, "hex")
  return current.length === expected.length && timingSafeEqual(current, expected)
}
