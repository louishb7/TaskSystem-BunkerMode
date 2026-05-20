import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import TacticalPanel from "../TacticalPanel";
import SectionHeader from "../SectionHeader";
import { bunkerTheme as theme } from "../../theme/bunkermodeTheme";

const WEEKDAYS = [
  { value: 0, label: "SEG" },
  { value: 1, label: "TER" },
  { value: 2, label: "QUA" },
  { value: 3, label: "QUI" },
  { value: 4, label: "SEX" },
  { value: 5, label: "SÁB" },
  { value: 6, label: "DOM" },
];

export default function OperationsSheet({
  formOpen,
  form,
  loading,
  operations,
  onClose,
  onToggleForm,
  onFieldChange,
  onToggleWeekday,
  onSubmit,
  onCloseOperation,
}) {
  return (
    <View style={styles.overlay}>
      <ScrollView contentContainerStyle={styles.content}>
        <TacticalPanel style={styles.panel}>
          <SectionHeader
            eyebrow="OPERAÇÕES"
            title="Plano em período fechado"
            meta="Ordens geradas por operação aparecem no quadro do dia e no Soldado."
          />

          <View style={styles.actions}>
            <Pressable
              disabled={loading}
              onPress={onToggleForm}
              style={styles.actionButton}
            >
              <Text style={styles.actionText}>
                {formOpen ? "FECHAR FORMULÁRIO" : "CRIAR OPERAÇÃO"}
              </Text>
            </Pressable>
            <Pressable
              disabled={loading}
              onPress={onClose}
              style={styles.actionButton}
            >
              <Text style={styles.actionText}>FECHAR</Text>
            </Pressable>
          </View>

          {formOpen ? (
            <View style={styles.form}>
              <TextInput
                onChangeText={(value) => onFieldChange("nome", value)}
                placeholder="NOME DA OPERAÇÃO"
                placeholderTextColor={theme.colors.textDim}
                style={styles.input}
                value={form.nome}
              />

              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <Text style={styles.dateLabel}>INÍCIO DA OPERAÇÃO</Text>
                  <TextInput
                    onChangeText={(value) => onFieldChange("start_date", value)}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={theme.colors.textMuted}
                    style={[styles.input, styles.dateInput]}
                    value={form.start_date}
                  />
                </View>
                <View style={styles.dateField}>
                  <Text style={styles.dateLabel}>FIM DA OPERAÇÃO</Text>
                  <TextInput
                    onChangeText={(value) => onFieldChange("end_date", value)}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={theme.colors.textMuted}
                    style={[styles.input, styles.dateInput]}
                    value={form.end_date}
                  />
                </View>
              </View>

              <View style={styles.weekdayGrid}>
                {WEEKDAYS.map((day) => (
                  <Pressable
                    key={day.value}
                    onPress={() => onToggleWeekday(day.value)}
                    style={[
                      styles.weekdayButton,
                      form.weekdays.includes(day.value) && styles.weekdaySelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.weekdayText,
                        form.weekdays.includes(day.value) && styles.weekdayTextSelected,
                      ]}
                    >
                      {day.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                onChangeText={(value) => onFieldChange("ordem_titulo", value)}
                placeholder="ORDEM DIÁRIA"
                placeholderTextColor={theme.colors.textDim}
                style={styles.input}
                value={form.ordem_titulo}
              />
              <TextInput
                onChangeText={(value) => onFieldChange("ordem_instrucao", value)}
                placeholder="INSTRUÇÃO OPCIONAL"
                placeholderTextColor={theme.colors.textDim}
                style={styles.input}
                value={form.ordem_instrucao}
              />

              <Pressable
                disabled={loading}
                onPress={onSubmit}
                style={[styles.submitButton, loading && styles.disabledButton]}
              >
                <Text style={styles.submitText}>
                  {loading ? "REGISTRANDO" : "REGISTRAR OPERAÇÃO"}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.operationRows}>
            {operations.length > 0 ? (
              operations.map((operation) => (
                <View key={String(operation.id)} style={styles.operationRow}>
                  <View style={styles.operationInfo}>
                    <Text numberOfLines={1} style={styles.operationName}>
                      {operation.nome}
                    </Text>
                    <Text numberOfLines={1} style={styles.operationMeta}>
                      {operation.status === "ativa" ? "ATIVA" : "ENCERRADA"} | {operation.ordem_titulo}
                    </Text>
                  </View>
                  {operation.status === "ativa" ? (
                    <Pressable
                      disabled={loading}
                      onPress={() => onCloseOperation(operation.id)}
                      style={styles.closeButton}
                    >
                      <Text style={styles.closeText}>ENCERRAR</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Nenhuma operação registrada.</Text>
            )}
          </View>
        </TacticalPanel>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.82)",
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: theme.spacing.screen,
  },
  panel: {
    marginTop: theme.spacing.md,
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  actionButton: {
    alignItems: "center",
    borderColor: theme.colors.fireBorder,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
  },
  actionText: {
    ...theme.typography.small,
    color: theme.colors.fire,
  },
  form: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  input: {
    ...theme.typography.body,
    backgroundColor: theme.colors.surfaceDeep,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.text,
    minHeight: 42,
    paddingHorizontal: theme.spacing.sm,
  },
  dateRow: {
    gap: theme.spacing.sm,
  },
  dateField: {
    backgroundColor: "rgba(255,138,42,0.07)",
    borderColor: theme.colors.fireBorder,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
  },
  dateLabel: {
    ...theme.typography.small,
    color: theme.colors.fire,
  },
  dateInput: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: theme.colors.fireBorder,
    color: theme.colors.white,
    flex: 0,
    fontSize: 16,
    fontWeight: "900",
    minHeight: 56,
    paddingHorizontal: theme.spacing.md,
  },
  weekdayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  weekdayButton: {
    alignItems: "center",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 34,
    minWidth: 42,
  },
  weekdaySelected: {
    borderColor: theme.colors.fireBorder,
  },
  weekdayText: {
    ...theme.typography.small,
    color: theme.colors.textDim,
  },
  weekdayTextSelected: {
    color: theme.colors.fire,
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: theme.colors.fire,
    borderRadius: theme.radius.sm,
    justifyContent: "center",
    minHeight: 46,
  },
  disabledButton: {
    opacity: 0.62,
  },
  submitText: {
    ...theme.typography.label,
    color: theme.colors.black,
  },
  operationRows: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  operationRow: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceDeep,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "space-between",
    padding: theme.spacing.sm,
  },
  operationInfo: {
    flex: 1,
    minWidth: 0,
  },
  operationName: {
    ...theme.typography.label,
    color: theme.colors.text,
  },
  operationMeta: {
    ...theme.typography.small,
    color: theme.colors.textDim,
    marginTop: 2,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  closeButton: {
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  closeText: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
  },
});
