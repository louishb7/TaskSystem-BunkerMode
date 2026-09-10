import React from "react"
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"

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
    <section className="work-surface grid gap-5 p-2 sm:p-5" aria-label="Calendário semanal">
      <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2">
        <Button
          aria-label="Semana anterior"
          className="px-0 text-base"
          variant="ghost"
          onClick={onPreviousWeek}
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </Button>
        <p className="m-0 flex items-center justify-center gap-2 text-sm font-semibold text-text-primary">
          <CalendarDays size={17} className="text-text-muted" aria-hidden="true" />
          {weekLabel}
        </p>
        <Button
          aria-label="Próxima semana"
          className="px-0 text-base"
          variant="ghost"
          onClick={onNextWeek}
        >
          <ChevronRight size={20} aria-hidden="true" />
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
