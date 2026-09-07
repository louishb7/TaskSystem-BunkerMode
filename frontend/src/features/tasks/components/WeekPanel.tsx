import React from "react"

import Button from "../../../components/ui/Button"
import DaySelector from "../../calendar/components/DaySelector"

export default function WeekPanel({
  onNextWeek,
  onPreviousWeek,
  onSelectDate,
  selectedDate,
  todayDate,
  weekLabel,
  weekDays,
}) {
  return (
    <section className="grid gap-4" aria-label="Calendário semanal">
      <div className="flex items-center justify-between gap-3">
        <Button aria-label="Semana anterior" variant="secondary" onClick={onPreviousWeek}>
          ←
        </Button>
        <p className="m-0 text-center text-sm font-medium text-text-primary">{weekLabel}</p>
        <Button aria-label="Próxima semana" variant="secondary" onClick={onNextWeek}>
          →
        </Button>
      </div>
      <DaySelector
        onSelectDate={onSelectDate}
        selectedDate={selectedDate}
        todayDate={todayDate}
        weekDays={weekDays}
      />
    </section>
  )
}
