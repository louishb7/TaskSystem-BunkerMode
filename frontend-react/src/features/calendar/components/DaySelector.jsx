import React from "react";

import { formatDateForApi } from "../../../utils/date.js";

const WEEK_LABELS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

export default function DaySelector({
  missionStatsByDate,
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
        const stats = missionStatsByDate[apiDate] || { completed: 0, total: 0 };
        const complete = stats.total > 0 && stats.completed === stats.total;
        const loadMarkers = Math.min(stats.total, 3);

        return (
          <button
            key={date.toISOString()}
            className={`day-node ${selected ? "selected" : ""} ${today ? "today" : ""} ${complete ? "complete" : ""}`}
            type="button"
            onClick={() => onSelectDate(date)}
          >
            <span className="day-week">{WEEK_LABELS[date.getDay()]}</span>
            <span className="day-number">{String(date.getDate()).padStart(2, "0")}</span>
            <span className="day-today">{today ? "HOJE" : "\u00A0"}</span>
            <span className="day-load" aria-label={`${stats.total} ordens`}>
              {Array.from({ length: loadMarkers }, (_, index) => (
                <span key={index} />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}
