import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { generalTheme } from "../../styles/generalTheme";
import { radius, spacing, typography } from "../../styles/tokens";

const commandColors = generalTheme.colors;

export default function GeneralCommandHeader({ generalName, onLogout, weekLabel }) {
  return (
    <View style={styles.header}>
      <View style={styles.identity}>
        <View style={styles.mark}>
          <Text style={styles.markText}>BM</Text>
        </View>
        <View>
          <Text style={styles.kicker}>POSTO DE COMANDO</Text>
          <Text numberOfLines={1} style={styles.name}>{generalName || "General"}</Text>
        </View>
      </View>
      <View style={styles.side}>
        <Text numberOfLines={1} style={styles.week}>{weekLabel}</Text>
        <Pressable onPress={onLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>SAIR</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.screenH,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  identity: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minWidth: 0,
  },
  mark: {
    alignItems: "center",
    backgroundColor: commandColors.panel,
    borderColor: commandColors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  markText: {
    color: commandColors.accentDark,
    fontSize: 11,
    fontWeight: "900",
  },
  kicker: {
    ...typography.small,
    color: commandColors.muted,
    fontWeight: "800",
  },
  name: {
    color: commandColors.ink,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 2,
  },
  side: {
    alignItems: "flex-end",
    gap: spacing.xs,
    maxWidth: 132,
  },
  week: {
    ...typography.small,
    color: commandColors.muted,
    fontWeight: "700",
  },
  logoutButton: {
    borderColor: commandColors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  logoutText: {
    ...typography.small,
    color: commandColors.accentDark,
    fontWeight: "900",
  },
});
