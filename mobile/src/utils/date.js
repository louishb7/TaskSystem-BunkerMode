export function startOfDay(value) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function addDays(value, amount) {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

export function getWeekDays(referenceDate) {
  const base = startOfDay(referenceDate);
  const mondayOffset = base.getDay() === 0 ? -6 : 1 - base.getDay();
  const monday = addDays(base, mondayOffset);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function formatShortDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

export function formatDateForApi(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${day}-${month}-${year}`;
}

export function normalizePrazo(value) {
  if (!value || typeof value !== "string") {
    return "";
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    return value;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split("-");
    return `${day}-${month}-${year}`;
  }
  return value;
}

export function formatWeekLabel(weekDays) {
  if (!weekDays.length) {
    return "";
  }
  return `${formatShortDate(weekDays[0])} a ${formatShortDate(weekDays[6])}`;
}

export function formatSelectedDate(date) {
  try {
    return date
      .toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
      })
      .toUpperCase();
  } catch {
    return formatShortDate(date);
  }
}
