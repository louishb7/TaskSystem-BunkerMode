import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { bunkerTheme as theme } from "../theme/bunkermodeTheme";
import BrandSymbol from "./BrandSymbol";

export default function CommandActionDock({
  active = false,
  bottomInset = 0,
  count = 0,
  generalName,
  onLayout,
  onLogout,
  onReviewPress,
  weekLabel,
}) {
  return (
    <View
      onLayout={onLayout}
      style={[
        styles.root,
        {
          paddingBottom: Math.max(bottomInset, theme.spacing.sm),
        },
      ]}
    >
      <View style={styles.console}>
        <View style={styles.topline}>
          <View style={styles.identity}>
            <BrandSymbol muted size={30} />
            <View style={styles.copy}>
              <Text style={styles.kicker}>POSTO DE COMANDO</Text>
              <Text numberOfLines={1} style={styles.name}>{generalName || "General"}</Text>
            </View>
          </View>
          <Pressable onPress={onLogout} style={styles.logout}>
            <Text style={styles.logoutText}>SAIR</Text>
          </Pressable>
        </View>

        <View style={styles.actionLine}>
          <Text numberOfLines={1} style={styles.week}>{weekLabel}</Text>
          <Pressable
            onPress={onReviewPress}
            style={({ pressed }) => [
              styles.reviewButton,
              active && styles.reviewButtonActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.reviewText, active && styles.reviewTextActive]}>RELATÓRIO</Text>
            {count > 0 ? (
              <View style={styles.countBox}>
                <Text style={styles.countText}>{count > 99 ? "99+" : count}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "rgba(14,14,14,0.84)",
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.sm,
    position: "absolute",
    right: 0,
    zIndex: 20,
  },
  console: {
    backgroundColor: "rgba(17,17,17,0.96)",
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  topline: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "space-between",
  },
  identity: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    minWidth: 0,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    ...theme.typography.small,
    color: theme.colors.textDim,
  },
  name: {
    ...theme.typography.label,
    color: theme.colors.text,
    fontSize: 14,
    marginTop: 1,
  },
  logout: {
    alignItems: "center",
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: theme.spacing.md,
  },
  logoutText: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
  },
  actionLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "space-between",
  },
  week: {
    ...theme.typography.small,
    color: theme.colors.textDim,
    flex: 1,
    minWidth: 0,
  },
  reviewButton: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceRaised,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: theme.spacing.md,
  },
  reviewButtonActive: {
    backgroundColor: theme.colors.fireWash,
    borderColor: theme.colors.fire,
  },
  pressed: {
    opacity: 0.72,
  },
  reviewText: {
    ...theme.typography.label,
    color: theme.colors.text,
    fontSize: 11,
  },
  reviewTextActive: {
    color: theme.colors.fire,
  },
  countBox: {
    alignItems: "center",
    backgroundColor: theme.colors.fire,
    borderColor: theme.colors.fire,
    borderWidth: 1,
    minWidth: 28,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 3,
  },
  countText: {
    ...theme.typography.small,
    color: theme.colors.black,
  },
});
