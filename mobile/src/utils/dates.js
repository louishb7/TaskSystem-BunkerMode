function parseApiDate(dateStr) {
  try {
    if (!dateStr || typeof dateStr !== "string") {
      return null;
    }

    const [dayRaw, monthRaw, yearRaw] = dateStr.split("-");
    const day = Number(dayRaw);
    const month = Number(monthRaw);
    const year = Number(yearRaw);

    if (!day || !month || !year) {
      return null;
    }

    const parsed = new Date(year, month - 1, day);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getDate() !== day ||
      parsed.getMonth() !== month - 1 ||
      parsed.getFullYear() !== year
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function formatDateForApi(date) {
  try {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return "";
    }

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear());
    return `${day}-${month}-${year}`;
  } catch {
    return "";
  }
}

export function getTomorrow() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

export function formatDisplayDate(dateStr) {
  if (dateStr === null || dateStr === undefined) {
    return "Sem prazo";
  }

  try {
    const parsed = parseApiDate(dateStr);
    if (!parsed) {
      return String(dateStr);
    }

    return parsed.toLocaleDateString();
  } catch {
    return String(dateStr);
  }
}

export function isToday(dateStr) {
  try {
    const parsed = parseApiDate(dateStr);
    if (!parsed) {
      return false;
    }

    return parsed.getTime() === startOfToday().getTime();
  } catch {
    return false;
  }
}

export function isPast(dateStr) {
  try {
    const parsed = parseApiDate(dateStr);
    if (!parsed) {
      return false;
    }

    return parsed.getTime() < startOfToday().getTime();
  } catch {
    return false;
  }
}

export function formatDateTime(value) {
  if (!value) {
    return "";
  }

  try {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return String(value);
    }
    return parsed.toLocaleString();
  } catch {
    return String(value);
  }
}
