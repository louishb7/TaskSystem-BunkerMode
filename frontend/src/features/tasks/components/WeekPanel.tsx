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
    <section className="grid gap-3" aria-label="Calendário semanal">
      <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
        <Button
          aria-label="Semana anterior"
          className="px-0 text-base"
          variant="ghost"
          onClick={onPreviousWeek}
        >
          ←
        </Button>
        <p className="m-0 text-center text-sm font-semibold text-text-primary">{weekLabel}</p>
        <Button
          aria-label="Próxima semana"
          className="px-0 text-base"
          variant="ghost"
          onClick={onNextWeek}
        >
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
