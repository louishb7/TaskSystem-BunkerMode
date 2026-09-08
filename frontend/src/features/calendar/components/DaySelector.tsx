import React from "react"

import { formatDateForApi } from "../../../utils/date"

const WEEK_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

export default function DaySelector({ onSelectDate, selectedDate, todayDate, weekDays }) {
  return (
    <div className="grid grid-cols-7 gap-1 sm:gap-2" aria-label="Calendário semanal">
      {weekDays.map((date) => {
        const apiDate = formatDateForApi(date)
        const selected = date.getTime() === selectedDate.getTime()
        const today = date.getTime() === todayDate.getTime()
        return (
          <button
            key={apiDate}
            aria-pressed={selected}
            className={`grid min-h-[72px] content-center justify-items-center rounded-control border text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${selected ? "border-accent bg-accent text-text-primary" : "border-border bg-surface text-text-primary hover:border-control-border"}`}
            type="button"
            onClick={() => onSelectDate(date)}
          >
            <span className="text-xs text-text-secondary">{WEEK_LABELS[date.getDay()]}</span>
            <span className="mt-1 text-lg font-semibold">
              {String(date.getDate()).padStart(2, "0")}
            </span>
            {today && <span className="mt-1 text-xs font-semibold uppercase">Hoje</span>}
          </button>
        )
      })}
    </div>
  )
}
