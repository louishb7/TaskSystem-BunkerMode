import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { bunkerTheme as theme } from "../theme/bunkermodeTheme";

export default function CommandActionDock({
  failureCount = 0,
  onClose,
  onOpen,
  onOpenReviews,
  open = false,
  reviewCount = 0,
}) {
  const pendingCount = Math.max(reviewCount, failureCount);

  return (
    <View pointerEvents="box-none" style={styles.root}>
      {open ? (
        <View style={styles.menu}>
          <DockOption count={reviewCount} label="Revisões" onPress={onOpenReviews} />
          <DockOption count={failureCount} label="Falhas" onPress={onOpenReviews} />
          <DockOption count={pendingCount} label="Pendências" onPress={onOpenReviews} />
          <DockOption disabled label="Relatórios" state="indisponível" />
        </View>
      ) : null}

      <Pressable
        onPress={open ? onClose : onOpen}
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
      >
        <Text style={styles.fabLabel}>{open ? "FECHAR" : "COMANDO"}</Text>
        <Text style={styles.fabCount}>{pendingCount}</Text>
      </Pressable>
    </View>
  );
}

function DockOption({ count, disabled = false, label, onPress, state }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.option, disabled && styles.optionDisabled]}
    >
      <View style={styles.optionCopy}>
        <Text style={[styles.optionLabel, disabled && styles.optionLabelDisabled]}>{label}</Text>
        <Text style={styles.optionState}>{state || "abrir painel"}</Text>
      </View>
      {typeof count === "number" ? (
        <View style={[styles.countBox, count > 0 && styles.countBoxActive]}>
          <Text style={[styles.countText, count > 0 && styles.countTextActive]}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "flex-end",
    bottom: 20,
    position: "absolute",
    right: theme.spacing.screen,
    zIndex: 20,
  },
  menu: {
    backgroundColor: "rgba(18,15,12,0.96)",
    borderColor: "rgba(245,240,232,0.18)",
    borderWidth: 1,
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
    width: 198,
  },
  option: {
    alignItems: "center",
    backgroundColor: "rgba(52,48,41,0.92)",
    borderColor: "rgba(245,240,232,0.12)",
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    minHeight: 44,
    paddingHorizontal: theme.spacing.sm,
  },
  optionDisabled: {
    opacity: 0.45,
  },
  optionCopy: {
    flex: 1,
    minWidth: 0,
  },
  optionLabel: {
    ...theme.typography.label,
    color: theme.colors.text,
  },
  optionLabelDisabled: {
    color: theme.colors.textMuted,
  },
  optionState: {
    ...theme.typography.small,
    color: theme.colors.textDim,
    marginTop: 2,
  },
  countBox: {
    alignItems: "center",
    borderColor: theme.colors.borderStrong,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    width: 34,
  },
  countBoxActive: {
    backgroundColor: theme.colors.red,
    borderColor: theme.colors.red,
  },
  countText: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
  },
  countTextActive: {
    color: theme.colors.black,
  },
  fab: {
    alignItems: "center",
    backgroundColor: theme.colors.rust,
    borderColor: theme.colors.amber,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    height: 62,
    justifyContent: "center",
    width: 62,
  },
  pressed: {
    opacity: 0.72,
  },
  fabLabel: {
    ...theme.typography.small,
    color: theme.colors.white,
    fontSize: 8,
  },
  fabCount: {
    color: theme.colors.red,
    fontSize: 18,
    fontWeight: "900",
    marginTop: -1,
  },
});
