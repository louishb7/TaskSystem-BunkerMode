from datetime import date, datetime, timedelta


OPERATIONAL_DAY_START_HOUR = 4


def operational_date_for(moment: datetime) -> date:
    return (moment - timedelta(hours=OPERATIONAL_DAY_START_HOUR)).date()
