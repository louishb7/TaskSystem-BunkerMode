import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { bunkerTheme as theme } from "../theme/bunkermodeTheme";

const TABS = [
  { key: "today", label: "Hoje" },
  { key: "mountain", label: "Montanha" },
  { key: "report", label: "Relatório" },
];

export default function GeneralTabs({ activeTab, bottomInset = 0, onChangeTab, reportCount = 0 }) {
  return (
    <View
      style={[
        styles.root,
        {
          paddingBottom: Math.max(bottomInset, theme.spacing.sm),
        },
      ]}
    >
      <View style={styles.tabs}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          const count = tab.key === "report" ? reportCount : 0;
          return (
            <Pressable
              key={tab.key}
              onPress={() => onChangeTab(tab.key)}
              style={({ pressed }) => [
                styles.tab,
                active && styles.tabActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {count > 0 ? (
                <View style={styles.countBox}>
                  <Text style={styles.countText}>{count > 99 ? "99+" : count}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "rgba(14,14,14,0.92)",
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
  tabs: {
    backgroundColor: "rgba(17,17,17,0.98)",
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.xs,
    padding: theme.spacing.xs,
  },
  tab: {
    alignItems: "center",
    borderColor: theme.colors.transparent,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: theme.spacing.xs,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: theme.spacing.xs,
  },
  tabActive: {
    backgroundColor: theme.colors.fireWash,
    borderColor: theme.colors.fireBorder,
  },
  tabText: {
    ...theme.typography.label,
    color: theme.colors.textMuted,
    fontSize: 10,
  },
  tabTextActive: {
    color: theme.colors.fire,
  },
  countBox: {
    alignItems: "center",
    backgroundColor: theme.colors.fire,
    borderColor: theme.colors.fire,
    borderWidth: 1,
    minWidth: 24,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
  },
  countText: {
    ...theme.typography.small,
    color: theme.colors.black,
    fontSize: 9,
  },
  pressed: {
    opacity: 0.72,
  },
});
