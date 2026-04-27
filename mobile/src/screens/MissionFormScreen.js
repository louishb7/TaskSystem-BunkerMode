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

function getErrorMessage(result, fallback) {
  return result?.data?.detail || fallback;
}

function initialPrazoTipo(mission) {
  return mission?.prazo ? "data_especifica" : "amanha";
}

export default function MissionFormScreen({ token, user, mission, onSave, onCancel, onLogout }) {
  const editingMission = mission !== null && mission !== undefined;
  const [titulo, setTitulo] = useState(mission?.titulo || "");
  const [instrucao, setInstrucao] = useState(mission?.instrucao || "");
  const [prazoTipo, setPrazoTipo] = useState(initialPrazoTipo(mission));
  const [prazo, setPrazo] = useState(mission?.prazo || "");
  const [prioridade, setPrioridade] = useState(Number(mission?.prioridade) || 2);
  const [focusedField, setFocusedField] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      setError("Informe titulo e instrucao.");
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
      setError(getErrorMessage(result, "Nao foi possivel salvar a missao."));
      return;
    }

    onSave();
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>BUNKERMODE</Text>
        <Text style={styles.title}>{editingMission ? "Editar missao" : "Nova missao"}</Text>

        <TextInput
          onBlur={() => setFocusedField("")}
          onChangeText={setTitulo}
          onFocus={() => setFocusedField("titulo")}
          placeholder="Ex.: Revisar plano semanal"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, focusedField === "titulo" && styles.inputFocused]}
          value={titulo}
        />

        <TextInput
          multiline
          onBlur={() => setFocusedField("")}
          onChangeText={setInstrucao}
          onFocus={() => setFocusedField("instrucao")}
          placeholder="Descreva exatamente o que deve ser feito"
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            styles.multiline,
            focusedField === "instrucao" && styles.inputFocused,
          ]}
          textAlignVertical="top"
          value={instrucao}
        />

        <Segmented
          options={[
            ["hoje", "Hoje"],
            ["amanha", "Amanha"],
            ["data_especifica", "Data especifica"],
          ]}
          selected={prazoTipo}
          onSelect={setPrazoTipo}
        />

        {prazoTipo === "data_especifica" ? (
          <TextInput
            onBlur={() => setFocusedField("")}
            onChangeText={setPrazo}
            onFocus={() => setFocusedField("prazo")}
            placeholder="DD-MM-YYYY"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, focusedField === "prazo" && styles.inputFocused]}
            value={prazo}
          />
        ) : null}

        <Segmented
          options={[
            [1, "Alta"],
            [2, "Media"],
            [3, "Baixa"],
          ]}
          selected={prioridade}
          onSelect={setPrioridade}
        />

        <StatusNotice type="error" message={error} />

        <Pressable
          disabled={loading}
          onPress={submit}
          style={[styles.submit, editingMission ? styles.submitEdit : styles.submitCreate]}
        >
          {loading ? (
            <ActivityIndicator color={colors.bg} />
          ) : (
            <Text style={styles.submitText}>{editingMission ? "SALVAR EDICAO" : "CRIAR MISSAO"}</Text>
          )}
        </Pressable>

        <Pressable disabled={loading} onPress={onCancel}>
          <Text style={styles.cancel}>CANCELAR</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Segmented({ options, selected, onSelect }) {
  return (
    <View style={styles.segmented}>
      {options.map(([value, label]) => {
        const active = selected === value;
        return (
          <Pressable
            key={String(value)}
            onPress={() => onSelect(value)}
            style={[styles.segment, active ? styles.segmentActive : styles.segmentInactive]}
          >
            <Text style={[styles.segmentText, active ? styles.segmentTextActive : styles.segmentTextInactive]}>
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
  content: {
    padding: spacing.screenH,
    paddingBottom: spacing.xl,
  },
  brand: {
    ...typography.label,
    color: colors.amber,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
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
    borderColor: colors.amber,
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
    backgroundColor: colors.amber,
  },
  segmentInactive: {
    backgroundColor: colors.bgCard,
  },
  segmentText: {
    ...typography.caption,
    fontWeight: "700",
    textAlign: "center",
  },
  segmentTextActive: {
    color: colors.bg,
  },
  segmentTextInactive: {
    color: colors.textSecondary,
  },
  submit: {
    alignItems: "center",
    borderRadius: radius.md,
    height: layout.actionButtonHeight,
    justifyContent: "center",
    width: layout.fullWidth,
  },
  submitCreate: {
    backgroundColor: colors.green,
  },
  submitEdit: {
    backgroundColor: colors.amber,
  },
  submitText: {
    ...typography.label,
    color: colors.bg,
    fontWeight: "700",
  },
  cancel: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.sm + spacing.xs,
    textAlign: "center",
  },
});
