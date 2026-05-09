import React from "react";

import DaySelector from "../../calendar/components/DaySelector.jsx";

export default function WeekPanel({
  missionCountsByDate,
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
          <p className="section-kicker">SEMANA OPERACIONAL</p>
          <h1>A semana na parede</h1>
          <p className="muted">
            Cada marca é um dia de caça. Escolha onde o General dará ordens.
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
        missionCountsByDate={missionCountsByDate}
        onSelectDate={onSelectDate}
        selectedDate={selectedDate}
        todayDate={todayDate}
        weekDays={weekDays}
      />
    </section>
  );
}
