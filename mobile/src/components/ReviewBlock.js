import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "../styles/tokens";
import { generalTheme } from "../styles/generalTheme";
import ReviewCard from "./ReviewCard";
import StatusNotice from "./StatusNotice";

const commandColors = generalTheme.colors;

export default function ReviewBlock({ missions, onLogout, onReload, token, tone = "default" }) {
  const command = tone === "command";

  if (!missions?.length) {
    return (
      <View style={[styles.empty, command && styles.commandEmpty]}>
        {command ? (
          <Text style={styles.commandEmptyText}>Nenhuma falha aguardando revisão.</Text>
        ) : (
          <StatusNotice type="info" message="Nenhuma falha aguardando revisão." />
        )}
      </View>
    );
  }

  return (
    <View>
      <Text style={[styles.warning, command && styles.commandWarning]}>FALHAS AGUARDANDO DECISÃO</Text>
      {missions.map((mission, index) => (
          <ReviewCard
            key={String(mission?.id ?? index)}
            mission={mission}
            tone={tone}
            token={token}
            onLogout={onLogout}
            onReload={onReload}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  warning: {
    ...typography.small,
    color: colors.red,
    fontWeight: "900",
    marginBottom: spacing.sm,
  },
  commandWarning: {
    color: commandColors.alert,
  },
  empty: {
    marginBottom: -spacing.md,
  },
  commandEmpty: {
    backgroundColor: commandColors.panel,
    borderColor: commandColors.border,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.xs,
  },
  commandEmptyText: {
    ...typography.notice,
    color: commandColors.muted,
  },
});
