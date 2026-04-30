import React from "react";
import { StyleSheet, Text, View } from "react-native";

import ReviewBlock from "../ReviewBlock";
import { generalTheme } from "../../styles/generalTheme";
import { radius, spacing, typography } from "../../styles/tokens";

const commandColors = generalTheme.colors;

export default function GeneralReviewDock({ missions, onLogout, onReload, token }) {
  const count = missions.length;
  const hasReview = count > 0;

  return (
    <View style={[styles.dock, hasReview && styles.dockActive]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.kicker, hasReview && styles.kickerActive]}>
            {hasReview ? "REVISÃO OBRIGATÓRIA" : "REVISÃO"}
          </Text>
          <Text style={styles.title}>
            {hasReview
              ? `${count} ${count === 1 ? "falha exige decisão" : "falhas exigem decisão"}`
              : "Nenhuma falha em aberto"}
          </Text>
        </View>
        <Text style={[styles.state, hasReview && styles.stateActive]}>
          {hasReview ? "PRIORIDADE" : "LIMPO"}
        </Text>
      </View>

      <Text style={styles.text}>
        {hasReview
          ? "Resolva a revisão antes de entregar novas ordens ao Soldado."
          : "O posto está livre para planejar a próxima execução."}
      </Text>

      {hasReview ? (
        <View style={styles.reviewList}>
          <ReviewBlock missions={missions} tone="command" token={token} onLogout={onLogout} onReload={onReload} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    backgroundColor: commandColors.panel,
    borderColor: commandColors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  dockActive: {
    backgroundColor: commandColors.alertBg,
    borderColor: commandColors.alert,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  kicker: {
    ...typography.small,
    color: commandColors.muted,
    fontWeight: "900",
  },
  kickerActive: {
    color: commandColors.alert,
  },
  title: {
    color: commandColors.ink,
    fontSize: 18,
    fontWeight: "900",
    marginTop: spacing.xs,
  },
  state: {
    ...typography.small,
    color: commandColors.accentDark,
    fontWeight: "900",
  },
  stateActive: {
    color: commandColors.alert,
  },
  text: {
    color: commandColors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  reviewList: {
    marginTop: spacing.md,
  },
});
