import React from "react"

import DaySelector from "../../calendar/components/DaySelector.jsx"

export default function WeekPanel({
  missionStatsByDate,
  onNextWeek,
  onPreviousWeek,
  onSelectDate,
  selectedDate,
  todayDate,
  weekLabel,
  weekDays,
}) {
  return (
    <section className="panel tactical-panel elevated">
      <div className="section-heading">
        <div>
          <h2>CRONOGRAMA DE CAÇA</h2>
          <p className="muted">Navegue entre os dias e defina as ordens do General.</p>
        </div>
      </div>
      <div className="week-navigation" aria-label="Navegação de semanas">
        <button
          className="button secondary compact week-nav-button"
          type="button"
          onClick={onPreviousWeek}
        >
          ← SEMANA
        </button>
        <strong>{weekLabel}</strong>
        <button
          className="button secondary compact week-nav-button"
          type="button"
          onClick={onNextWeek}
        >
          SEMANA →
        </button>
      </div>
      <DaySelector
        missionStatsByDate={missionStatsByDate}
        onSelectDate={onSelectDate}
        selectedDate={selectedDate}
        todayDate={todayDate}
        weekDays={weekDays}
      />
    </section>
  )
}
