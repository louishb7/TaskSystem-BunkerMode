import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { bunkerTheme as theme } from "../theme/bunkermodeTheme";

const weekDayLabels = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function isSameCalendarDay(left, right) {
  return (
    left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
  );
}

function formatApiDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${day}-${month}-${year}`;
}

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
  dayOffDates = new Set(),
  missionStatsByDate = null,
  missionCountsByDate = {},
  onSelectDate,
  onToggleDayOff,
  selectedDate,
  todayDate,
  weekDays,
}) {
  return (
    <View style={styles.container}>
      {weekDays.map((date) => {
        const selected = isSameCalendarDay(date, selectedDate);
        const today = isSameCalendarDay(date, todayDate);
        const rawStats = missionStatsByDate?.[formatApiDate(date)];
        const total = rawStats?.total ?? missionCountsByDate[formatApiDate(date)] ?? 0;
        const completed = rawStats?.completed ?? 0;
        const complete = total > 0 && completed === total;
        const apiDate = formatApiDate(date);
        const isDayOff = dayOffDates?.has?.(apiDate) || total === 0;
        const persistedDayOff = dayOffDates?.has?.(apiDate);
        const percent = total > 0 ? Math.round((completed / total) * 100) : null;
        const tone = isDayOff ? "neutral" : executionTone(percent);

        return (
          <Pressable
            key={date.toISOString()}
            onLongPress={() => onToggleDayOff?.(date)}
            onPress={() => onSelectDate(date)}
            style={[
              styles.day,
              total > 0 && styles.dayWithMission,
              complete && styles.dayComplete,
              today && styles.dayToday,
              selected && styles.daySelected,
            ]}
          >
            <Text style={[styles.weekday, selected && styles.weekdaySelected]}>
              {weekDayLabels[date.getDay()]}
            </Text>
            <Text style={[styles.today, !today && styles.hiddenToday]}>
              {today ? "HOJE" : " "}
            </Text>
            <View style={styles.countRow}>
              <Text style={[styles.count, styles[`count${tone}`]]}>
                {isDayOff ? "OFF" : `${percent}%`}
              </Text>
            </View>
            {persistedDayOff ? <Text style={styles.offMark}>OFF</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: theme.spacing.xs,
    minHeight: 72,
  },
  day: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.24)",
    borderColor: theme.colors.border,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 72,
    paddingHorizontal: 3,
    paddingVertical: theme.spacing.xs,
  },
  dayWithMission: {
    borderColor: theme.colors.borderStrong,
  },
  dayComplete: {
    backgroundColor: theme.colors.successWash,
    borderColor: theme.colors.successBorder,
  },
  dayToday: {
    borderColor: theme.colors.fireBorder,
  },
  daySelected: {
    backgroundColor: theme.colors.fireWash,
    borderColor: theme.colors.fire,
  },
  weekday: {
    ...theme.typography.small,
    color: theme.colors.text,
    fontSize: 11,
  },
  weekdaySelected: {
    color: theme.colors.white,
  },
  today: {
    ...theme.typography.small,
    color: theme.colors.fire,
    fontSize: 8,
    marginTop: 2,
  },
  hiddenToday: {
    color: theme.colors.transparent,
  },
  countRow: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  count: {
    ...theme.typography.small,
    color: theme.colors.textDim,
    fontSize: 9,
  },
  countActive: {
    color: theme.colors.textMuted,
  },
  countComplete: {
    color: theme.colors.success,
  },
  counthigh: {
    color: theme.colors.success,
  },
  countmedium: {
    color: theme.colors.fire,
  },
  countlow: {
    color: theme.colors.red,
  },
  countneutral: {
    color: theme.colors.textDim,
  },
  offMark: {
    ...theme.typography.small,
    color: theme.colors.textDim,
    fontSize: 8,
  },
  offButtonTextActive: {
    color: theme.colors.textMuted,
  },
});
