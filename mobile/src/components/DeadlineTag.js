import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, layout, radius, surfaces, typography } from "../styles/tokens";

function parseDateOnly(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const text = String(value);
  const ddmmyyyy = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddmmyyyy) {
    return new Date(Number(ddmmyyyy[3]), Number(ddmmyyyy[2]) - 1, Number(ddmmyyyy[1]));
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
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

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (date.getTime() === today.getTime()) {
    return {
      label: "HOJE",
      color: colors.amber,
      borderColor: colors.amber,
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
