import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { generalTheme } from "../../styles/generalTheme";
import { radius, spacing, typography } from "../../styles/tokens";

const commandColors = generalTheme.colors;
const weekDayLabels = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function formatDayNumber(date) {
  return String(date.getDate()).padStart(2, "0");
}

function isSameCalendarDay(left, right) {
  return (
    left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
  );
}

export default function WeeklyPlanningBoard({
  onSelectDate,
  selectedDate,
  todayDate,
  weekDays,
}) {
  return (
    <View style={styles.board}>
      <View style={styles.timeline}>
        <View pointerEvents="none" style={styles.routeLine} />
        {weekDays.map((date) => {
          const selected = isSameCalendarDay(date, selectedDate);
          const today = isSameCalendarDay(date, todayDate);
          return (
            <Pressable
              key={date.toISOString()}
              onPress={() => onSelectDate(date)}
              style={styles.dayStation}
            >
              <Text style={[styles.dayLabel, selected && styles.dayLabelSelected]}>
                {weekDayLabels[date.getDay()]}
              </Text>
              <View style={[styles.node, today && styles.nodeToday, selected && styles.nodeSelected]}>
                <Text style={[styles.dayNumber, selected && styles.dayNumberSelected]}>
                  {formatDayNumber(date)}
                </Text>
              </View>
              {today ? <Text style={styles.todayLabel}>HOJE</Text> : <View style={styles.todayPlaceholder} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    borderBottomColor: commandColors.border,
    borderBottomWidth: 1,
    paddingBottom: spacing.md,
  },
  timeline: {
    flexDirection: "row",
    minHeight: 82,
    position: "relative",
  },
  routeLine: {
    backgroundColor: commandColors.route,
    height: 2,
    left: 18,
    opacity: 0.34,
    position: "absolute",
    right: 18,
    top: 35,
  },
  dayStation: {
    alignItems: "center",
    flex: 1,
  },
  dayLabel: {
    ...typography.small,
    color: commandColors.muted,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  dayLabelSelected: {
    color: commandColors.accentDark,
  },
  node: {
    alignItems: "center",
    backgroundColor: commandColors.canvas,
    borderColor: commandColors.boardLine,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  nodeToday: {
    borderColor: commandColors.accent,
    borderWidth: 2,
  },
  nodeSelected: {
    backgroundColor: commandColors.accentDark,
    borderColor: commandColors.accentDark,
    height: 40,
    marginTop: -3,
    width: 40,
  },
  dayNumber: {
    color: commandColors.ink,
    fontSize: 14,
    fontWeight: "900",
  },
  dayNumberSelected: {
    color: commandColors.white,
  },
  todayLabel: {
    ...typography.small,
    color: commandColors.accentDark,
    fontWeight: "900",
    marginTop: spacing.xs,
  },
  todayPlaceholder: {
    height: 14,
    marginTop: spacing.xs,
  },
});
