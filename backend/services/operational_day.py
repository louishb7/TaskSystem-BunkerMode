from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo


OPERATIONAL_DAY_START_HOUR = 4
OPERATIONAL_TIMEZONE = "America/Recife"
_OPERATIONAL_ZONE = ZoneInfo(OPERATIONAL_TIMEZONE)


def operational_date_for(moment: datetime) -> date:
    if not isinstance(moment, datetime):
        raise ValueError("Instante operacional inválido.")
    local_moment = moment
    if moment.tzinfo is not None:
        local_moment = moment.astimezone(_OPERATIONAL_ZONE)
    return (local_moment - timedelta(hours=OPERATIONAL_DAY_START_HOUR)).date()


def calendar_date_for(moment: datetime) -> date:
    if not isinstance(moment, datetime):
        raise ValueError("Instante operacional inválido.")
    if moment.tzinfo is not None:
        return moment.astimezone(_OPERATIONAL_ZONE).date()
    return moment.date()


def now_in_operational_timezone() -> datetime:
    return datetime.now(_OPERATIONAL_ZONE)


def current_operational_date(now_provider) -> date:
    return operational_date_for(now_provider())


def operational_week_bounds(reference_date: date) -> tuple[date, date]:
    if not isinstance(reference_date, date) or isinstance(reference_date, datetime):
        raise ValueError("Data operacional inválida.")
    start = reference_date - timedelta(days=reference_date.weekday())
    end = start + timedelta(days=6)
    return start, end


def previous_operational_week_bounds(reference_date: date) -> tuple[date, date]:
    start, _ = operational_week_bounds(reference_date)
    end = start - timedelta(days=1)
    previous_start = end - timedelta(days=6)
    return previous_start, end


def parse_iso_date(value: str | None, message: str) -> date | None:
    if value is None:
        return None
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError) as error:
        raise ValueError(message) from error
