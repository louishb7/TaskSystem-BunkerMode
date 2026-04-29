import React from "react";
import { Pressable, StatusBar, StyleSheet, Text, View } from "react-native";

import { colors, layout, radius, spacing, typography } from "../styles/tokens";

const statusBarHeight = StatusBar.currentHeight || 0;

export default function Header({ user, missionCount, refreshing, onRefresh, onLogout }) {
  const orderLabel = missionCount === 1 ? "1 ordem" : `${missionCount} ordens`;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.brand}>BUNKERMODE</Text>
        <View style={styles.rightGroup}>
          <Pressable onPress={onLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Sair</Text>
          </Pressable>
          <View style={styles.modeBadge}>
            <Text style={styles.modeText}>MODO SOLDADO</Text>
          </View>
        </View>
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.title}>Em campo</Text>
        <Pressable
          disabled={refreshing}
          onPress={onRefresh}
          style={styles.refreshButton}
        >
          {({ pressed }) => (
            <Text style={[styles.refreshText, (pressed || refreshing) && styles.refreshActive]}>
              ⟳
            </Text>
          )}
        </Pressable>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.caption}>Operador: {user?.usuario || "Soldado"}</Text>
        <Text style={styles.caption}>{orderLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
    borderBottomColor: colors.borderSubtle,
    borderBottomWidth: 1,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.screenH,
    paddingTop: spacing.screenH + statusBarHeight,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  brand: {
    ...typography.label,
    color: colors.textPrimary,
  },
  rightGroup: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  modeBadge: {
    backgroundColor: colors.transparent,
    borderColor: colors.red,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs - 1,
  },
  modeText: {
    ...typography.label,
    color: colors.red,
  },
  logoutButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  logoutText: {
    color: colors.textMuted,
    ...typography.caption,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm + spacing.xs,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  refreshButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  refreshText: {
    color: colors.textMuted,
    fontSize: layout.refreshIconSize,
  },
  refreshActive: {
    color: colors.textPrimary,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  caption: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
