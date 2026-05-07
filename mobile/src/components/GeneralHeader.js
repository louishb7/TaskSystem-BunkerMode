import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { bunkerTheme as theme } from "../theme/bunkermodeTheme";
import BrandSymbol from "./BrandSymbol";

export default function GeneralHeader({ generalName, onLogout, weekLabel }) {
  return (
    <View style={styles.header}>
      <View style={styles.identity}>
        <BrandSymbol muted size={42} />
        <View style={styles.copy}>
          <Text style={styles.kicker}>POSTO DE COMANDO</Text>
          <Text numberOfLines={1} style={styles.name}>{generalName || "General"}</Text>
        </View>
      </View>
      <View style={styles.side}>
        <Text numberOfLines={1} style={styles.week}>{weekLabel}</Text>
        <Pressable onPress={onLogout} style={styles.logout}>
          <Text style={styles.logoutText}>SAIR</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    backgroundColor: "rgba(18,15,12,0.94)",
    borderBottomColor: "rgba(245,240,232,0.16)",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.md,
    justifyContent: "space-between",
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.md,
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
    color: theme.colors.amber,
  },
  name: {
    ...theme.typography.heading,
    color: theme.colors.text,
    fontSize: 18,
    marginTop: 2,
  },
  side: {
    alignItems: "flex-end",
    maxWidth: 128,
  },
  week: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.xs,
  },
  logout: {
    backgroundColor: "rgba(52,48,41,0.72)",
    borderColor: "rgba(245,240,232,0.18)",
    borderWidth: 1,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  logoutText: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
  },
});
