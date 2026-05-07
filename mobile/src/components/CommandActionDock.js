import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { bunkerTheme as theme } from "../theme/bunkermodeTheme";

export default function CommandActionDock({
  active = false,
  bottomOffset = 96,
  count = 0,
  onPress,
}) {
  return (
    <View pointerEvents="box-none" style={[styles.root, { bottom: bottomOffset }]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.fab,
          active && styles.fabActive,
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.fabLabel, active && styles.fabLabelActive]}>PÓS-AÇÃO</Text>
        {count > 0 ? (
          <View style={styles.countBox}>
            <Text style={styles.countText}>{count > 99 ? "99+" : count}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "flex-end",
    position: "absolute",
    right: theme.spacing.screen,
    zIndex: 20,
  },
  fab: {
    alignItems: "center",
    backgroundColor: "rgba(35,30,23,0.96)",
    borderColor: "rgba(182,138,58,0.66)",
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    minHeight: 52,
    paddingHorizontal: theme.spacing.md,
  },
  fabActive: {
    backgroundColor: theme.colors.rust,
    borderColor: theme.colors.amber,
  },
  pressed: {
    opacity: 0.72,
  },
  fabLabel: {
    ...theme.typography.label,
    color: theme.colors.white,
    fontSize: 11,
  },
  fabLabelActive: {
    color: theme.colors.white,
  },
  countBox: {
    alignItems: "center",
    backgroundColor: theme.colors.red,
    borderColor: theme.colors.red,
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
