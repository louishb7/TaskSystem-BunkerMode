import React from "react";
import { StyleSheet, Text, View } from "react-native";

import ReviewBlock from "../ReviewBlock";
import { generalTheme } from "../../styles/generalTheme";
import { radius, spacing } from "../../styles/tokens";

const commandColors = generalTheme.colors;

export default function GeneralReviewDock({ missions, onLogout, onReload, token }) {
  const count = missions.length;
  const hasReview = count > 0;

  return (
    <View style={styles.drawer}>
      {hasReview ? (
        <ReviewBlock missions={missions} tone="command" token={token} onLogout={onLogout} onReload={onReload} />
      ) : null}

      {!hasReview ? (
        <Text style={styles.emptyText}>Nenhuma revisão pendente.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    backgroundColor: commandColors.panel,
    borderColor: commandColors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  emptyText: {
    color: commandColors.muted,
    fontSize: 13,
  },
});
