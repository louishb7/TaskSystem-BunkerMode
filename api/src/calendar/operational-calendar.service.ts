import { Injectable } from "@nestjs/common"

export const DEFAULT_OPERATIONAL_TIMEZONE = "America/Recife"

type DateParts = {
  year: string
  month: string
  day: string
}

function assertValidDate(moment: Date): void {
  if (!(moment instanceof Date) || Number.isNaN(moment.getTime())) {
    throw new Error("Instante operacional inválido.")
  }
}

export function normalizeTimezone(timezone: string | null | undefined): string {
  const normalized = timezone?.trim() || DEFAULT_OPERATIONAL_TIMEZONE
  try {
    Intl.DateTimeFormat("en-US", { timeZone: normalized }).format(new Date())
    return normalized
  } catch (error) {
    throw new Error("Fuso horário inválido.")
  }
}

function datePartsFor(moment: Date, timezone: string): DateParts {
  assertValidDate(moment)
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: normalizeTimezone(timezone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(moment)

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    year: byType.year,
    month: byType.month,
    day: byType.day,
  }
}

function dateFromIsoDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function addDays(value: Date, amount: number): Date {
  const next = new Date(value)
  next.setUTCDate(next.getUTCDate() + amount)
  return next
}

@Injectable()
export class OperationalCalendarService {
  currentDateFor(moment: Date, timezone = DEFAULT_OPERATIONAL_TIMEZONE): string {
    const parts = datePartsFor(moment, timezone)
    return `${parts.year}-${parts.month}-${parts.day}`
  }

  weekBounds(referenceDate: string): { start_date: string; end_date: string } {
    const date = dateFromIsoDate(referenceDate)
    assertValidDate(date)
    const day = date.getUTCDay()
    const mondayOffset = day === 0 ? -6 : 1 - day
    const start = addDays(date, mondayOffset)
    return {
      start_date: isoDate(start),
      end_date: isoDate(addDays(start, 6)),
    }
  }

  previousWeekBounds(referenceDate: string): { start_date: string; end_date: string } {
    const currentWeek = this.weekBounds(referenceDate)
    const end = addDays(dateFromIsoDate(currentWeek.start_date), -1)
    return {
      start_date: isoDate(addDays(end, -6)),
      end_date: isoDate(end),
    }
  }
}
