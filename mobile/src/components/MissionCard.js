import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../styles/tokens";
import ActionArea from "./ActionArea";
import Badge from "./Badge";
import DeadlineTag from "./DeadlineTag";
import PriorityBar from "./PriorityBar";

export default function MissionCard({ mission, onComplete, onJustify }) {
  const title = mission?.titulo || "Sem titulo";
  const instruction = mission?.instrucao || "";
  const isDecided = mission?.is_decided === true;
  const statusLabel = mission?.status_label || "";
  const dueDate = mission?.due_date ?? null;

  return (
    <View style={[styles.card, isDecided && styles.decidedCard]}>
      <View style={styles.metaRow}>
        <PriorityBar priority={mission?.prioridade} />
        <DeadlineTag dueDate={dueDate} />
      </View>

      <Text style={styles.title}>{title}</Text>

      {instruction ? (
        <Text numberOfLines={3} style={styles.instruction}>
          {instruction}
        </Text>
      ) : null}

      <View style={styles.badgeRow}>
        {isDecided ? <Badge type="decided" /> : null}
        <Badge type="status" label={statusLabel} />
      </View>

      <ActionArea mission={mission} onComplete={onComplete} onJustify={onJustify} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderColor: colors.borderSubtle,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm + spacing.xs,
    padding: spacing.cardPad,
  },
  decidedCard: {
    borderLeftColor: colors.amber,
    borderLeftWidth: 3,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
    marginTop: spacing.sm + spacing.xs / 2,
  },
  instruction: {
    ...typography.missionInstruction,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm + spacing.xs / 2,
  },
});
