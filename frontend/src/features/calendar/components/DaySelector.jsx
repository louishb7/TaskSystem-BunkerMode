import React from "react"

import { formatDateForApi } from "../../../utils/date.js"

const WEEK_LABELS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"]

function executionTone(percent) {
  if (percent >= 80) {
    return "high"
  }
  if (percent >= 40) {
    return "medium"
  }
  return "low"
}

export default function DaySelector({
  missionStatsByDate,
  onSelectDate,
  selectedDate,
  todayDate,
  weekDays,
}) {
  return (
    <div className="week-board" aria-label="Cronograma de caça">
      {weekDays.map((date) => {
        const apiDate = formatDateForApi(date)
        const selected = date.getTime() === selectedDate.getTime()
        const today = date.getTime() === todayDate.getTime()
        const past = date.getTime() < todayDate.getTime()
        const future = date.getTime() > todayDate.getTime()
        const stats = missionStatsByDate[apiDate] || { completed: 0, total: 0 }
        const isDayOff = past && stats.total === 0
        const complete = stats.total > 0 && stats.completed === stats.total
        const percent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
        const hasExecutionLabel = !future && (today || past || stats.total > 0)
        const executionLabel = isDayOff ? "DIA OFF" : hasExecutionLabel ? `${percent}%` : ""
        const tone = isDayOff ? "off" : hasExecutionLabel ? executionTone(percent) : "neutral"
        return (
          <div
            key={date.toISOString()}
            className={`day-node ${selected ? "selected" : ""} ${today ? "today" : ""} ${complete ? "complete" : ""} execution-${tone}`}
          >
            <button className="day-select-button" type="button" onClick={() => onSelectDate(date)}>
              <span className="day-week">{WEEK_LABELS[date.getDay()]}</span>
              {today && <span className="day-status day-today">HOJE</span>}
              {executionLabel && (
                <span
                  className="day-status day-execution"
                  aria-label={isDayOff ? "Dia off" : `${percent}% do Leão do Dia`}
                >
                  {executionLabel}
                </span>
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}
