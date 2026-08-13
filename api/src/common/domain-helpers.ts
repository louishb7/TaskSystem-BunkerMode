import { HttpException, HttpStatus } from "@nestjs/common"

import { UserRecord } from "../auth/auth.types"

export function ensureGeneral(user: UserRecord, message = "Planejamento indisponível enquanto o modo Soldado estiver ativo."): void {
  if (user.active_mode !== "general") {
    throw new HttpException(message, HttpStatus.FORBIDDEN)
  }
}

export function requiredText(value: unknown, message: string, maxLength?: number): string {
  if (typeof value !== "string") {
    throw new HttpException(message, HttpStatus.BAD_REQUEST)
  }
  const normalized = value.trim()
  if (!normalized) {
    throw new HttpException(message, HttpStatus.BAD_REQUEST)
  }
  if (maxLength !== undefined && normalized.length > maxLength) {
    throw new HttpException(message, HttpStatus.BAD_REQUEST)
  }
  return normalized
}

export function optionalText(value: unknown, message = "Campo textual inválido."): string | null {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value !== "string") {
    throw new HttpException(message, HttpStatus.BAD_REQUEST)
  }
  const normalized = value.trim()
  return normalized || null
}

export function positiveInt(value: unknown, message: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new HttpException(message, HttpStatus.BAD_REQUEST)
  }
  return value
}

export function optionalPositiveInt(value: unknown, message: string): number | null {
  if (value === null || value === undefined || value === "") {
    return null
  }
  return positiveInt(value, message)
}

export function parseIsoDate(value: unknown, message: string): Date | null {
  if (value === null || value === undefined || value === "") {
    return null
  }
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    throw new HttpException(message, HttpStatus.BAD_REQUEST)
  }
  const [year, month, day] = value.trim().split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new HttpException(message, HttpStatus.BAD_REQUEST)
  }
  return date
}

export function dateOnly(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null
}

export function dateTime(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null
}
