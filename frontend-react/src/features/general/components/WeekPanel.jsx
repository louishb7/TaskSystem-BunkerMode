import React from "react";

import DaySelector from "../../calendar/components/DaySelector.jsx";

export default function WeekPanel({
  missionCountsByDate,
  onSelectDate,
  selectedDate,
  todayDate,
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
