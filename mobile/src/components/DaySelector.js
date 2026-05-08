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

function formatDayNumber(date) {
  return String(date.getDate()).padStart(2, "0");
}

function formatApiDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${day}-${month}-${year}`;
}

export default function DaySelector({
  missionCountsByDate = {},
  onSelectDate,
  selectedDate,
  todayDate,
  weekDays,
}) {
  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={styles.boardPlate} />
      <View pointerEvents="none" style={styles.line} />
      {weekDays.map((date) => {
        const selected = isSameCalendarDay(date, selectedDate);
        const today = isSameCalendarDay(date, todayDate);
        const count = missionCountsByDate[formatApiDate(date)] || 0;

        return (
          <Pressable
            key={date.toISOString()}
            onPress={() => onSelectDate(date)}
            style={styles.day}
          >
            <Text style={[styles.weekday, selected && styles.weekdaySelected]}>
              {weekDayLabels[date.getDay()]}
            </Text>
            <View
              style={[
                styles.node,
                count > 0 && styles.nodeWithMission,
                today && styles.nodeToday,
                selected && styles.nodeSelected,
              ]}
            >
              <Text style={[styles.number, selected && styles.numberSelected]}>
                {formatDayNumber(date)}
              </Text>
            </View>
            <Text style={[styles.today, !today && styles.hiddenToday]}>
              {today ? "HOJE" : " "}
            </Text>
            <View style={styles.countRow}>
              <View style={[styles.countDot, count > 0 && styles.countDotActive]} />
              <Text style={[styles.count, count > 0 && styles.countActive]}>
                {count > 0 ? `${count}` : "-"}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    minHeight: 112,
    paddingHorizontal: theme.spacing.xs,
    paddingTop: theme.spacing.sm,
    position: "relative",
  },
  boardPlate: {
    backgroundColor: "rgba(17,17,17,0.58)",
    borderColor: theme.colors.borderSoft,
    borderWidth: 1,
    bottom: 10,
    left: 0,
    position: "absolute",
    right: 0,
    top: 28,
  },
  line: {
    backgroundColor: theme.colors.borderStrong,
    height: 1,
    left: 20,
    position: "absolute",
    right: 20,
    top: 45,
  },
  day: {
    alignItems: "center",
    flex: 1,
  },
  weekday: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  weekdaySelected: {
    color: theme.colors.white,
  },
  node: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.none,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  nodeWithMission: {
    borderColor: theme.colors.textMuted,
  },
  nodeToday: {
    borderColor: theme.colors.red,
    borderWidth: 2,
  },
  nodeSelected: {
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.red,
  },
  number: {
    ...theme.typography.label,
    color: theme.colors.white,
    fontSize: 14,
  },
  numberSelected: {
    color: theme.colors.white,
  },
  today: {
    ...theme.typography.small,
    color: theme.colors.red,
    marginTop: theme.spacing.xs,
  },
  hiddenToday: {
    color: theme.colors.transparent,
  },
  countRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
    justifyContent: "center",
    marginTop: theme.spacing.xs,
  },
  countDot: {
    backgroundColor: theme.colors.borderStrong,
    height: 5,
    width: 5,
  },
  countDotActive: {
    backgroundColor: theme.colors.textMuted,
  },
  count: {
    ...theme.typography.small,
    color: theme.colors.textDim,
    fontSize: 9,
  },
  countActive: {
    color: theme.colors.textMuted,
  },
});
