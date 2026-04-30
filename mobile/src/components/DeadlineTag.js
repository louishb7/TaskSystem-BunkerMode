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

const commandColors = {
  alert: "#A33A32",
  alertBg: "#F7E7E3",
  border: "#C8D0C3",
  muted: "#6F776D",
  panel: "#F7F8F2",
  text: "#2F4A3A",
};

function getDeadline(value, tone) {
  const command = tone === "command";

  const date = parseDateOnly(value);
  if (!date) {
    return {
      label: "PERMANENTE",
      color: command ? commandColors.muted : colors.textMuted,
      borderColor: command ? commandColors.border : colors.bgCard,
      backgroundColor: command ? commandColors.panel : colors.bgCard,
    };
  }

  let today;
  try {
    const now = new Date();
    today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } catch {
    return {
      label: "PERMANENTE",
      color: command ? commandColors.muted : colors.textMuted,
      borderColor: command ? commandColors.border : colors.bgCard,
      backgroundColor: command ? commandColors.panel : colors.bgCard,
    };
  }

  if (date.getTime() === today.getTime()) {
    return {
      label: "HOJE",
      color: command ? commandColors.alert : colors.red,
      borderColor: command ? commandColors.alert : colors.red,
      backgroundColor: command ? commandColors.alertBg : surfaces.amberBg,
    };
  }

  if (date.getTime() < today.getTime()) {
    return {
      label: "EXPIRADA",
      color: command ? commandColors.alert : colors.red,
      borderColor: command ? commandColors.alert : colors.red,
      backgroundColor: command ? commandColors.alertBg : surfaces.redBg,
    };
  }

  return {
    label: formatShortDate(date),
    color: command ? commandColors.text : colors.textSecondary,
    borderColor: command ? commandColors.border : colors.borderStrong,
    backgroundColor: command ? commandColors.panel : colors.bgCard,
  };
}

export default function DeadlineTag({ dueDate, tone }) {
  const selected = getDeadline(dueDate, tone);

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
