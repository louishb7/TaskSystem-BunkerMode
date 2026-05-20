import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { bunkerTheme as theme } from "../../theme/bunkermodeTheme";

export default function ActivateSoldierDialog({
  loading,
  todayMissions,
  onCancel,
  onConfirm,
}) {
  return (
    <View style={styles.overlay}>
      <View style={styles.box}>
        <Text style={styles.kicker}>FOCO OPERACIONAL</Text>
        <Text style={styles.title}>Briefing tático</Text>
        <Text style={styles.body}>
          Você está prestes a entrar em modo Soldado. Abaixo estão as ordens do dia. Execute sem renegociar.
        </Text>

        {todayMissions.length > 0 ? (
          <View style={styles.missionsContainer}>
            <Text style={styles.missionsLabel}>
              {todayMissions.length === 1
                ? "1 ORDEM NO DIA DE HOJE"
                : `${todayMissions.length} ORDENS NO DIA DE HOJE`}
            </Text>
            <ScrollView
              style={styles.missionsList}
              contentContainerStyle={styles.missionsContent}
              showsVerticalScrollIndicator={false}
            >
              {todayMissions.map((mission, index) => (
                <View
                  key={String(mission?.id ?? index)}
                  style={[
                    styles.missionRow,
                    mission?.is_pinned && styles.missionRowPinned,
                  ]}
                >
                  {mission?.is_pinned ? (
                    <Text style={styles.pinIndicator}>▲</Text>
                  ) : null}
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.missionTitle,
                      mission?.is_pinned && styles.missionTitlePinned,
                    ]}
                  >
                    {mission?.titulo || "—"}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.emptyMissions}>
            <Text style={styles.emptyText}>Nenhuma ordem definida para hoje.</Text>
          </View>
        )}

        <View style={styles.actions}>
          <Pressable
            disabled={loading}
            onPress={onCancel}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>CANCELAR</Text>
          </Pressable>
          <Pressable
            disabled={loading}
            onPress={onConfirm}
            style={[styles.confirmButton, loading && styles.confirmDisabled]}
          >
            <Text style={styles.confirmText}>
              {loading ? "ABRINDO" : "SAIR PARA A CAÇA"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: "center",
    padding: theme.spacing.screen,
  },
  box: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.fireBorder,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.md,
    maxHeight: "80%",
    padding: theme.spacing.lg,
    width: "100%",
  },
  kicker: {
    ...theme.typography.small,
    color: theme.colors.fire,
  },
  title: {
    ...theme.typography.heading,
    color: theme.colors.text,
  },
  body: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  missionsContainer: {
    gap: theme.spacing.sm,
  },
  missionsLabel: {
    ...theme.typography.small,
    color: theme.colors.textDim,
  },
  missionsList: {
    maxHeight: 180,
  },
  missionsContent: {
    gap: theme.spacing.xs,
  },
  missionRow: {
    backgroundColor: theme.colors.surfaceDeep,
    borderColor: theme.colors.borderSoft,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs + 2,
  },
  missionRowPinned: {
    borderColor: theme.colors.purpleBorder,
    backgroundColor: theme.colors.purpleWash,
  },
  pinIndicator: {
    color: theme.colors.neonPurple,
    fontSize: 9,
  },
  missionTitle: {
    ...theme.typography.caption,
    color: theme.colors.text,
    flex: 1,
  },
  missionTitlePinned: {
    color: theme.colors.neonPurple,
  },
  emptyMissions: {
    backgroundColor: "rgba(0,0,0,0.22)",
    borderColor: theme.colors.borderSoft,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    padding: theme.spacing.sm,
  },
  emptyText: {
    ...theme.typography.caption,
    color: theme.colors.textDim,
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  cancelButton: {
    alignItems: "center",
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
  },
  cancelText: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
  },
  confirmButton: {
    alignItems: "center",
    backgroundColor: theme.colors.fire,
    borderColor: theme.colors.fire,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
    ...theme.shadow.fire,
  },
  confirmText: {
    ...theme.typography.label,
    color: theme.colors.black,
    fontSize: 12,
  },
  confirmDisabled: {
    opacity: 0.58,
  },
});
