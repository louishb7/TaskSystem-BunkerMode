import React from "react";

import { formatDateForApi } from "../../../utils/date.js";

const WEEK_LABELS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

export default function DaySelector({
  missionCountsByDate,
  onSelectDate,
  selectedDate,
  todayDate,
  weekDays,
}) {
  return (
    <div className="week-board" aria-label="Semana operacional">
      {weekDays.map((date) => {
        const apiDate = formatDateForApi(date);
        const selected = date.getTime() === selectedDate.getTime();
        const today = date.getTime() === todayDate.getTime();
        const count = missionCountsByDate[apiDate] || 0;

        return (
          <button
            key={date.toISOString()}
            className={`day-node ${selected ? "selected" : ""} ${today ? "today" : ""}`}
            type="button"
            onClick={() => onSelectDate(date)}
          >
            <span className="day-week">{WEEK_LABELS[date.getDay()]}</span>
            <span className="day-number">{String(date.getDate()).padStart(2, "0")}</span>
            <span className="day-today">{today ? "HOJE" : "\u00A0"}</span>
            <span className="day-count">{count > 0 ? count : "-"}</span>
          </button>
        );
      })}
    </div>
  );
}
