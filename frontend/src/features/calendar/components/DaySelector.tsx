import React from "react"

import { formatDateForApi } from "../../../utils/date"

const WEEK_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

export default function DaySelector({ onSelectDate, selectedDate, todayDate, weekDays }) {
  return (
    <div className="grid grid-cols-7 gap-0.5 sm:gap-2" aria-label="Dias da semana">
      {weekDays.map((date) => {
        const apiDate = formatDateForApi(date)
        const selected = date.getTime() === selectedDate.getTime()
        const today = date.getTime() === todayDate.getTime()
        return (
          <button
            key={apiDate}
            aria-pressed={selected}
            aria-current={today ? "date" : undefined}
            aria-label={date.toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
            className={`relative grid min-h-24 min-w-0 content-center justify-items-center gap-1 rounded-xl border px-0 text-sm font-medium transition-[background-color,border-color,transform] active:scale-[0.97] motion-reduce:transition-none motion-reduce:transform-none focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${selected ? "border-selection-border bg-selection text-selection-text shadow-surface after:absolute after:inset-x-4 after:bottom-2 after:h-0.5 after:rounded-full after:bg-selection-border" : "border-transparent bg-surface-subtle text-text-primary hover:border-border-strong hover:bg-peripheral"}`}
            type="button"
            onClick={() => onSelectDate(date)}
          >
            <span className="text-xs text-text-secondary">{WEEK_LABELS[date.getDay()]}</span>
            <span className="mt-1 text-xl font-semibold sm:text-2xl">
              {String(date.getDate()).padStart(2, "0")}
            </span>
            <span
              className={`mt-0.5 mb-1 min-h-4 text-[10px] font-semibold tracking-wide uppercase ${today ? "text-text-secondary" : "invisible"}`}
              aria-hidden={!today}
            >
              Hoje
            </span>
          </button>
        )
      })}
    </div>
  )
}
