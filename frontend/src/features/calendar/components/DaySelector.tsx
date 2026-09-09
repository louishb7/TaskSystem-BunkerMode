import React from "react"

import { formatDateForApi } from "../../../utils/date"

const WEEK_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

export default function DaySelector({ onSelectDate, selectedDate, todayDate, weekDays }) {
  return (
    <div
      className="grid grid-cols-7 border-y border-border bg-surface-subtle"
      aria-label="Dias da semana"
    >
      {weekDays.map((date) => {
        const apiDate = formatDateForApi(date)
        const selected = date.getTime() === selectedDate.getTime()
        const today = date.getTime() === todayDate.getTime()
        return (
          <button
            key={apiDate}
            aria-pressed={selected}
            className={`relative grid min-h-[76px] min-w-0 content-center justify-items-center border-0 border-l border-border bg-transparent px-1 text-sm font-medium text-text-primary transition-colors first:border-l-0 hover:bg-surface focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus-ring ${selected ? "bg-selection font-semibold after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-selection-border" : ""}`}
            type="button"
            onClick={() => onSelectDate(date)}
          >
            <span className="text-xs text-text-secondary">{WEEK_LABELS[date.getDay()]}</span>
            <span className="mt-1 text-base font-semibold sm:text-lg">
              {String(date.getDate()).padStart(2, "0")}
            </span>
            <span
              className={`mt-0.5 min-h-4 text-[10px] font-semibold tracking-wide uppercase ${today ? "text-text-secondary" : "invisible"}`}
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
