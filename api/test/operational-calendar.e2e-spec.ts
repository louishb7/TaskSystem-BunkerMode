import { OperationalCalendarService, normalizeTimezone } from "../src/calendar/operational-calendar.service"

describe("OperationalCalendarService", () => {
  const calendar = new OperationalCalendarService()

  it("uses the user's timezone only to resolve the local calendar date", () => {
    const moment = new Date("2026-04-25T02:30:00.000Z")

    expect(calendar.currentDateFor(moment, "America/Recife")).toBe("2026-04-24")
    expect(calendar.currentDateFor(moment, "Europe/Lisbon")).toBe("2026-04-25")
  })

  it("does not apply a fixed 04:00 cutoff", () => {
    const earlyMorning = new Date("2026-04-25T06:30:00.000Z")

    expect(calendar.currentDateFor(earlyMorning, "America/Recife")).toBe("2026-04-25")
  })

  it("calculates Monday-to-Sunday week bounds from the local date", () => {
    expect(calendar.weekBounds("2026-04-26")).toEqual({
      start_date: "2026-04-20",
      end_date: "2026-04-26",
    })
    expect(calendar.previousWeekBounds("2026-04-27")).toEqual({
      start_date: "2026-04-20",
      end_date: "2026-04-26",
    })
  })

  it("falls back to the default timezone and rejects invalid timezone names", () => {
    expect(normalizeTimezone("")).toBe("America/Recife")
    expect(() => normalizeTimezone("Timezone/Invalido")).toThrow("Fuso horário inválido.")
  })
})
