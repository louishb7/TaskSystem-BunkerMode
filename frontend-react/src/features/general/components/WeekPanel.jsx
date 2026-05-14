import React from "react";

import DaySelector from "../../calendar/components/DaySelector.jsx";

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
          <h1>CRONOGRAMA DE CAÇA</h1>
          <p className="muted">
            Abata o leão do dia. Escolha onde o General dará ordens.
          </p>
        </div>
      </div>
      <div className="week-navigation" aria-label="Navegação de semanas">
        <button className="button secondary compact week-nav-button" type="button" onClick={onPreviousWeek}>
          SEMANA ANTERIOR
        </button>
        <strong>{weekLabel}</strong>
        <button className="button secondary compact week-nav-button" type="button" onClick={onNextWeek}>
          PRÓXIMA SEMANA
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
  );
}
