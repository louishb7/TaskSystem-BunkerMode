import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "../api/client";
import StatusNotice from "../components/StatusNotice";
import { formatDateForApi, getTomorrow } from "../utils/dates";
import { colors, layout, radius, spacing, typography } from "../styles/tokens";
import { generalTheme } from "../styles/generalTheme";

const commandColors = generalTheme.colors;

function getErrorMessage(result, fallback) {
  return result?.data?.detail || fallback;
}

function initialPrazoTipo(mission, initialPrazo) {
  return mission?.prazo || initialPrazo ? "data_especifica" : "amanha";
}

function formatPrazoContext(prazo) {
  if (!prazo || typeof prazo !== "string") {
    return "";
  }
  const [day, month] = prazo.split("-");
  if (!day || !month) {
    return prazo;
  }
  return `${day}/${month}`;
}

export default function MissionFormScreen({
  token,
  user,
  mission,
  initialPrazo,
  onSave,
  onCancel,
  onLogout,
  tone = "default",
}) {
  const editingMission = mission !== null && mission !== undefined;
  const command = tone === "command";
  const [titulo, setTitulo] = useState(mission?.titulo || "");
  const [instrucao, setInstrucao] = useState(mission?.instrucao || "");
  const [prazoTipo, setPrazoTipo] = useState(initialPrazoTipo(mission, initialPrazo));
  const [prazo, setPrazo] = useState(mission?.prazo || initialPrazo || "");
  const [prioridade, setPrioridade] = useState(Number(mission?.prioridade) || 2);
  const [focusedField, setFocusedField] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const lockedInitialPrazo = Boolean(initialPrazo && !editingMission);
  const prazoContext = formatPrazoContext(initialPrazo);

  function buildDeadline() {
    if (prazoTipo === "hoje") {
      return formatDateForApi(new Date());
    }
    if (prazoTipo === "amanha") {
      return formatDateForApi(getTomorrow());
    }
    return prazo;
  }

  async function submit() {
    if (!titulo.trim() || !instrucao.trim()) {
      setError("Informe título e instrução.");
      return;
    }

    const payload = {
      titulo: titulo.trim(),
      instrucao: instrucao.trim(),
      prioridade,
      prazo: buildDeadline(),
    };

    if (!editingMission) {
      payload.responsavel_id = user?.usuario_id ?? user?.id;
    }

    setLoading(true);
    setError("");
    const result = editingMission
      ? await api.updateMission(token, mission.id, payload)
      : await api.createMission(token, payload);
    setLoading(false);

    if (result.status === 401) {
      onLogout?.();
      return;
    }

    if (!result.ok) {
      setError(getErrorMessage(result, "Não foi possível salvar a missão."));
      return;
    }

    onSave();
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, command && styles.commandContainer]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.brand, command && styles.commandBrand]}>BUNKERMODE</Text>
        <Text style={[styles.title, command && styles.commandTitle]}>{editingMission ? "Editar missão" : "Nova ordem"}</Text>
        {lockedInitialPrazo ? (
          <View style={[styles.deadlineContext, command && styles.commandDeadlineContext]}>
            <Text style={[styles.deadlineContextLabel, command && styles.commandDeadlineContextLabel]}>DATA DEFINIDA</Text>
            <Text style={[styles.deadlineContextValue, command && styles.commandDeadlineContextValue]}>{prazoContext}</Text>
          </View>
        ) : null}

        <TextInput
          onBlur={() => setFocusedField("")}
          onChangeText={setTitulo}
          onFocus={() => setFocusedField("titulo")}
          placeholder="Ex.: Revisar plano semanal"
          placeholderTextColor={command ? commandColors.muted : colors.textMuted}
          style={[
            styles.input,
            command && styles.commandInput,
            focusedField === "titulo" && (command ? styles.commandInputFocused : styles.inputFocused),
          ]}
          value={titulo}
        />

        <TextInput
          multiline
          onBlur={() => setFocusedField("")}
          onChangeText={setInstrucao}
          onFocus={() => setFocusedField("instrucao")}
          placeholder="Descreva exatamente o que deve ser feito"
          placeholderTextColor={command ? commandColors.muted : colors.textMuted}
          style={[
            styles.input,
            command && styles.commandInput,
            styles.multiline,
            focusedField === "instrucao" && (command ? styles.commandInputFocused : styles.inputFocused),
          ]}
          textAlignVertical="top"
          value={instrucao}
        />

        {!lockedInitialPrazo ? (
          <>
            <Segmented
              options={[
                ["hoje", "Hoje"],
                ["amanha", "Amanhã"],
                ["data_especifica", "Data específica"],
              ]}
              selected={prazoTipo}
              onSelect={setPrazoTipo}
              tone={tone}
            />

            {prazoTipo === "data_especifica" ? (
              <TextInput
                onBlur={() => setFocusedField("")}
                onChangeText={setPrazo}
                onFocus={() => setFocusedField("prazo")}
                placeholder="DD-MM-YYYY"
                placeholderTextColor={command ? commandColors.muted : colors.textMuted}
                style={[
                  styles.input,
                  command && styles.commandInput,
                  focusedField === "prazo" && (command ? styles.commandInputFocused : styles.inputFocused),
                ]}
                value={prazo}
              />
            ) : null}
          </>
        ) : null}

        <Segmented
          options={[
            [1, "Alta"],
            [2, "Média"],
            [3, "Baixa"],
          ]}
          selected={prioridade}
          onSelect={setPrioridade}
          tone={tone}
        />

        <StatusNotice type="error" message={error} tone={tone} />

        <Pressable
          disabled={loading}
          onPress={submit}
          style={[
            styles.submit,
            editingMission ? styles.submitEdit : styles.submitCreate,
            command && styles.commandSubmit,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={command ? commandColors.white : colors.bg} />
          ) : (
            <Text style={[styles.submitText, command && styles.commandSubmitText]}>
              {editingMission ? "SALVAR EDIÇÃO" : command ? "REGISTRAR ORDEM" : "CRIAR ORDEM"}
            </Text>
          )}
        </Pressable>

        <Pressable disabled={loading} onPress={onCancel}>
          <Text style={[styles.cancel, command && styles.commandCancel]}>CANCELAR</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Segmented({ options, selected, onSelect, tone = "default" }) {
  const command = tone === "command";
  return (
    <View style={styles.segmented}>
      {options.map(([value, label]) => {
        const active = selected === value;
        return (
          <Pressable
            key={String(value)}
            onPress={() => onSelect(value)}
            style={[
              styles.segment,
              active ? styles.segmentActive : styles.segmentInactive,
              command && styles.commandSegment,
              command && active && styles.commandSegmentActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                active ? styles.segmentTextActive : styles.segmentTextInactive,
                command && (active ? styles.commandSegmentTextActive : styles.commandSegmentTextInactive),
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  commandContainer: {
    backgroundColor: commandColors.canvas,
  },
  content: {
    padding: spacing.screenH,
    paddingBottom: spacing.xl,
  },
  brand: {
    ...typography.label,
    color: colors.textPrimary,
  },
  commandBrand: {
    color: commandColors.muted,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  commandTitle: {
    color: commandColors.ink,
  },
  input: {
    backgroundColor: colors.bgCard,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: typography.input.fontSize,
    marginBottom: spacing.sm + spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.xs + spacing.xs / 2,
  },
  inputFocused: {
    borderColor: colors.red,
  },
  commandInput: {
    backgroundColor: commandColors.panel,
    borderColor: commandColors.borderStrong,
    color: commandColors.ink,
  },
  commandInputFocused: {
    borderColor: commandColors.accentDark,
  },
  deadlineContext: {
    backgroundColor: colors.bgCard,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm + spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.xs,
  },
  commandDeadlineContext: {
    backgroundColor: commandColors.panelMuted,
    borderColor: commandColors.border,
  },
  deadlineContextLabel: {
    ...typography.small,
    color: colors.textMuted,
    fontWeight: "700",
  },
  commandDeadlineContextLabel: {
    color: commandColors.muted,
  },
  deadlineContextValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
    marginTop: spacing.xs,
  },
  commandDeadlineContextValue: {
    color: commandColors.ink,
  },
  multiline: {
    minHeight: layout.justificationInputMinHeight,
  },
  segmented: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm + spacing.xs,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
  segmentActive: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  segmentInactive: {
    backgroundColor: colors.bgCard,
  },
  commandSegment: {
    borderColor: commandColors.borderStrong,
  },
  commandSegmentActive: {
    backgroundColor: commandColors.accentDark,
    borderColor: commandColors.accentDark,
  },
  segmentText: {
    ...typography.caption,
    fontWeight: "700",
    textAlign: "center",
  },
  segmentTextActive: {
    color: colors.black,
  },
  segmentTextInactive: {
    color: colors.textSecondary,
  },
  commandSegmentTextActive: {
    color: commandColors.white,
  },
  commandSegmentTextInactive: {
    color: commandColors.muted,
  },
  submit: {
    alignItems: "center",
    borderRadius: radius.md,
    height: layout.actionButtonHeight,
    justifyContent: "center",
    width: layout.fullWidth,
  },
  submitCreate: {
    backgroundColor: colors.red,
  },
  submitEdit: {
    backgroundColor: colors.red,
  },
  commandSubmit: {
    backgroundColor: commandColors.soldier,
  },
  submitText: {
    ...typography.label,
    color: colors.black,
    fontWeight: "700",
  },
  commandSubmitText: {
    color: commandColors.white,
  },
  cancel: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.sm + spacing.xs,
    textAlign: "center",
  },
  commandCancel: {
    color: commandColors.muted,
  },
});
