import React from "react";

import { formatDateForApi } from "../../../utils/date.js";

const WEEK_LABELS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function executionTone(percent) {
  if (percent >= 80) {
    return "high";
  }
  if (percent >= 40) {
    return "medium";
  }
  return "low";
}

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
        const percent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : null;
        const tone = percent === null ? "neutral" : executionTone(percent);

        return (
          <button
            key={date.toISOString()}
            className={`day-node ${selected ? "selected" : ""} ${today ? "today" : ""} ${complete ? "complete" : ""} execution-${tone}`}
            type="button"
            onClick={() => onSelectDate(date)}
          >
            <span className="day-week">{WEEK_LABELS[date.getDay()]}</span>
            <span className="day-number">{String(date.getDate()).padStart(2, "0")}</span>
            <span className="day-today">{today ? "HOJE" : "\u00A0"}</span>
            <span
              className="day-execution"
              aria-label={percent === null ? "Sem ordens no dia" : `${percent}% do Leão do Dia`}
            >
              {percent === null ? "SEM ORDENS" : `${percent}%`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
