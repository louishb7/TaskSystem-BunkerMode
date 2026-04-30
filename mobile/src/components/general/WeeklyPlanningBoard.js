import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { generalTheme } from "../../styles/generalTheme";
import { radius, spacing, typography } from "../../styles/tokens";

const commandColors = generalTheme.colors;
const weekDayLabels = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

function formatDayNumber(date) {
  return String(date.getDate()).padStart(2, "0");
}

export default function WeeklyPlanningBoard({
  onCreate,
  onSelectDate,
  selectedDate,
  selectedDateLabel,
  todayTime,
  weekDays,
}) {
  return (
    <View style={styles.board}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>SEMANA OPERACIONAL</Text>
          <Text style={styles.title}>Planejar {selectedDateLabel}</Text>
        </View>
        <Pressable onPress={onCreate} style={styles.createButton}>
          <Text style={styles.createText}>NOVA ORDEM — {selectedDateLabel}</Text>
        </Pressable>
      </View>

      <View style={styles.timeline}>
        <View pointerEvents="none" style={styles.routeLine} />
        {weekDays.map((date) => {
          const dayTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
          const selected = dayTime === selectedDate.getTime();
          const today = dayTime === todayTime;
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
              <Text style={[styles.todayLabel, today && styles.todayVisible]}>
                HOJE
              </Text>
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
  header: {
    alignItems: "flex-start",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  kicker: {
    ...typography.small,
    color: commandColors.muted,
    fontWeight: "800",
  },
  title: {
    color: commandColors.ink,
    fontSize: 24,
    fontWeight: "900",
    marginTop: spacing.xs,
  },
  createButton: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: commandColors.soldier,
    borderColor: commandColors.soldier,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 46,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  createText: {
    ...typography.label,
    color: commandColors.white,
    fontWeight: "900",
  },
  timeline: {
    flexDirection: "row",
    marginTop: spacing.md,
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
    color: commandColors.transparent,
    fontWeight: "900",
    marginTop: spacing.xs,
  },
  todayVisible: {
    color: commandColors.accentDark,
  },
});
