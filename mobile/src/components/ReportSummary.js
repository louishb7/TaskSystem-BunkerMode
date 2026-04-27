import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing } from "../styles/tokens";

function valueOrDash(value, suffix = "") {
  if (value === undefined || value === null) {
    return "—";
  }
  return `${value}${suffix}`;
}

export default function ReportSummary({ report }) {
  const metrics = [
    ["Taxa de conclusao", valueOrDash(report?.completion_rate, "%")],
    ["Concluidas / total", `${valueOrDash(report?.completed_missions)} / ${valueOrDash(report?.total_missions)}`],
    ["Falhas em decididas", valueOrDash(report?.committed_missions_failed)],
    ["Aguardando justificativa", valueOrDash(report?.missions_waiting_justification)],
  ];

  return (
    <View style={styles.container}>
      {metrics.map(([label, value], index) => (
        <View
          key={label}
          style={[styles.row, index < metrics.length - 1 ? styles.rowWithDivider : null]}
        >
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.cardPad,
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
  label: {
    color: colors.textSecondary,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  value: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
});
