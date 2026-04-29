import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, layout, radius, surfaces, typography } from "../styles/tokens";

function parseDateOnly(value) {
  try {
    if (!value) {
      return null;
    }

    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  } catch {
    return null;
  }
}

function formatShortDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

function getDeadline(value) {
  const date = parseDateOnly(value);
  if (!date) {
    return {
      label: "PERMANENTE",
      color: colors.textMuted,
      borderColor: colors.bgCard,
      backgroundColor: colors.bgCard,
    };
  }

  let today;
  try {
    const now = new Date();
    today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } catch {
    return {
      label: "PERMANENTE",
      color: colors.textMuted,
      borderColor: colors.bgCard,
      backgroundColor: colors.bgCard,
    };
  }

  if (date.getTime() === today.getTime()) {
    return {
      label: "HOJE",
      color: colors.red,
      borderColor: colors.red,
      backgroundColor: surfaces.amberBg,
    };
  }

  if (date.getTime() < today.getTime()) {
    return {
      label: "EXPIRADA",
      color: colors.red,
      borderColor: colors.red,
      backgroundColor: surfaces.redBg,
    };
  }

  return {
    label: formatShortDate(date),
    color: colors.textSecondary,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bgCard,
  };
}

export default function DeadlineTag({ dueDate }) {
  const selected = getDeadline(dueDate);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: selected.backgroundColor,
          borderColor: selected.borderColor,
        },
      ]}
    >
      <Text style={[styles.text, { color: selected.color }]}>{selected.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: layout.tagPadH,
    paddingVertical: layout.tagPadV,
  },
  text: {
    ...typography.small,
    fontWeight: "600",
  },
});
