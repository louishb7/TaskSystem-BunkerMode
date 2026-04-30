import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { generalTheme } from "../../styles/generalTheme";
import { radius, spacing, typography } from "../../styles/tokens";

const commandColors = generalTheme.colors;

export default function GeneralDayActionPanel({ onCreate, reviewCount, reviewOpen, onToggleReview }) {
  return (
    <View style={styles.panel}>
      <Pressable onPress={onCreate} style={styles.createButton}>
        <Text style={styles.createText}>NOVA ORDEM</Text>
      </Pressable>

      <Pressable
        onPress={onToggleReview}
        style={[styles.reviewButton, reviewCount > 0 && styles.reviewButtonActive]}
      >
        <Text style={[styles.reviewText, reviewCount > 0 && styles.reviewTextActive]}>
          REVISÕES ({reviewCount})
        </Text>
        <Text style={[styles.reviewState, reviewCount > 0 && styles.reviewStateActive]}>
          {reviewOpen ? "FECHAR" : "ABRIR"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignItems: "stretch",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  createButton: {
    alignItems: "center",
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
  reviewButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: commandColors.panelMuted,
    borderColor: commandColors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 34,
    paddingHorizontal: spacing.md,
  },
  reviewButtonActive: {
    backgroundColor: commandColors.alertBg,
    borderColor: commandColors.alert,
  },
  reviewText: {
    ...typography.small,
    color: commandColors.accentDark,
    fontWeight: "900",
  },
  reviewTextActive: {
    color: commandColors.alert,
  },
  reviewState: {
    ...typography.small,
    color: commandColors.muted,
    fontWeight: "900",
  },
  reviewStateActive: {
    color: commandColors.alert,
  },
});
