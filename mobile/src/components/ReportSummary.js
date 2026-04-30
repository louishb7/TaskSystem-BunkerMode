import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../styles/tokens";

function valueOrDash(value, suffix = "") {
  if (value === undefined || value === null) {
    return "—";
  }
  return `${value}${suffix}`;
}

export default function ReportSummary({ report, tone = "default" }) {
  const command = tone === "command";
  const metrics = [
    ["Taxa de conclusão", valueOrDash(report?.completion_rate, "%")],
    ["Concluídas / total", `${valueOrDash(report?.completed_missions)} / ${valueOrDash(report?.total_missions)}`],
    ["Falhas em decididas", valueOrDash(report?.committed_missions_failed)],
    ["Aguardando justificativa", valueOrDash(report?.missions_waiting_justification)],
  ];

  return (
    <View style={[styles.container, command && styles.commandContainer]}>
      {metrics.map(([label, value], index) => (
        <View
          key={label}
          style={[
            styles.row,
            index < metrics.length - 1 ? styles.rowWithDivider : null,
            command && index < metrics.length - 1 ? styles.commandRowWithDivider : null,
          ]}
        >
          <Text style={[styles.label, command && styles.commandLabel]}>{label}</Text>
          <Text style={[styles.value, command && styles.commandValue]}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.cardPad,
  },
  commandContainer: {
    backgroundColor: "#F7F8F2",
    borderColor: "#C8D0C3",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  rowWithDivider: {
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: 1,
  },
  commandRowWithDivider: {
    borderBottomColor: "#C8D0C3",
  },
  label: {
    ...typography.small,
    color: colors.textSecondary,
  },
  commandLabel: {
    color: "#5E6A5F",
  },
  value: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  commandValue: {
    color: "#20231F",
  },
});
