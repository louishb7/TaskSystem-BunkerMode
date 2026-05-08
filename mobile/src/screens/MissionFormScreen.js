import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "../api/client";
import KeyboardAwareScreen from "../components/KeyboardAwareScreen";
import SectionHeader from "../components/SectionHeader";
import StatusNotice from "../components/StatusNotice";
import TacticalPanel from "../components/TacticalPanel";
import { bunkerTheme as theme } from "../theme/bunkermodeTheme";
import { formatDateForApi, getTomorrow } from "../utils/dates";

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
}) {
  const editingMission = mission !== null && mission !== undefined;
  const [titulo, setTitulo] = useState(mission?.titulo || "");
  const [instrucao, setInstrucao] = useState(mission?.instrucao || "");
  const [prazoTipo, setPrazoTipo] = useState(initialPrazoTipo(mission, initialPrazo));
  const [prazo, setPrazo] = useState(mission?.prazo || initialPrazo || "");
  const [focusedField, setFocusedField] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const tituloRef = useRef(null);
  const instrucaoRef = useRef(null);
  const prazoRef = useRef(null);
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
    <KeyboardAwareScreen
      bottomPadding={theme.spacing.xxl}
      contentContainerStyle={styles.content}
      extraScrollHeight={132}
      keyboardBottomPadding={260}
    >
      {({ scrollToFocusedInput }) => (
        <>
          <Text style={styles.brand}>BUNKERMODE</Text>
          <SectionHeader
            eyebrow="POSTO DE COMANDO"
            title={editingMission ? "Editar ordem" : "Nova ordem"}
            meta="A ordem deve dizer exatamente o que será executado."
          />

          <TacticalPanel elevated>
            {lockedInitialPrazo ? (
              <View style={styles.deadlineContext}>
                <Text style={styles.deadlineContextLabel}>DATA DEFINIDA</Text>
                <Text style={styles.deadlineContextValue}>{prazoContext}</Text>
              </View>
            ) : null}

            <TextInput
              onBlur={() => setFocusedField("")}
              onChangeText={setTitulo}
              onFocus={() => {
                setFocusedField("titulo");
                scrollToFocusedInput(tituloRef);
              }}
              placeholder="Ex.: Revisar plano semanal"
              placeholderTextColor={theme.colors.textDim}
              ref={tituloRef}
              style={[styles.input, focusedField === "titulo" && styles.inputFocused]}
              value={titulo}
            />

            <TextInput
              multiline
              onBlur={() => setFocusedField("")}
              onChangeText={setInstrucao}
              onFocus={() => {
                setFocusedField("instrucao");
                scrollToFocusedInput(instrucaoRef);
              }}
              placeholder="Descreva exatamente o que deve ser feito"
              placeholderTextColor={theme.colors.textDim}
              ref={instrucaoRef}
              style={[
                styles.input,
                styles.multiline,
                focusedField === "instrucao" && styles.inputFocused,
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
                />

                {prazoTipo === "data_especifica" ? (
                  <TextInput
                    onBlur={() => setFocusedField("")}
                    onChangeText={setPrazo}
                    onFocus={() => {
                      setFocusedField("prazo");
                      scrollToFocusedInput(prazoRef);
                    }}
                    placeholder="DD-MM-AAAA"
                    placeholderTextColor={theme.colors.textDim}
                    ref={prazoRef}
                    style={[styles.input, focusedField === "prazo" && styles.inputFocused]}
                    value={prazo}
                  />
                ) : null}
              </>
            ) : null}

            <StatusNotice type="error" message={error} />

            <Pressable disabled={loading} onPress={submit} style={[styles.submit, loading && styles.disabled]}>
              {loading ? (
                <ActivityIndicator color={theme.colors.black} />
              ) : (
                <Text style={styles.submitText}>
                  {editingMission ? "SALVAR EDIÇÃO" : "REGISTRAR ORDEM"}
                </Text>
              )}
            </Pressable>

            <Pressable disabled={loading} onPress={onCancel} style={styles.cancelButton}>
              <Text style={styles.cancel}>CANCELAR</Text>
            </Pressable>
          </TacticalPanel>
        </>
      )}
    </KeyboardAwareScreen>
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
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: theme.spacing.screen,
  },
  brand: {
    ...theme.typography.small,
    color: theme.colors.textDim,
    marginBottom: theme.spacing.md,
  },
  input: {
    ...theme.typography.body,
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    minHeight: theme.layout.actionHeight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  inputFocused: {
    borderColor: theme.colors.red,
  },
  multiline: {
    minHeight: 132,
  },
  deadlineContext: {
    backgroundColor: theme.colors.redWash,
    borderColor: theme.colors.red,
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  deadlineContextLabel: {
    ...theme.typography.small,
    color: theme.colors.red,
  },
  deadlineContextValue: {
    ...theme.typography.heading,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  segmented: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  segment: {
    alignItems: "center",
    borderColor: theme.colors.borderStrong,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: theme.spacing.sm,
  },
  segmentActive: {
    backgroundColor: theme.colors.red,
    borderColor: theme.colors.red,
  },
  segmentText: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
  segmentTextActive: {
    color: theme.colors.black,
  },
  submit: {
    alignItems: "center",
    backgroundColor: theme.colors.red,
    borderColor: theme.colors.red,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: theme.layout.actionHeight,
    width: "100%",
  },
  submitText: {
    ...theme.typography.label,
    color: theme.colors.black,
    fontSize: 14,
  },
  cancelButton: {
    alignItems: "center",
    minHeight: 42,
    justifyContent: "center",
    marginTop: theme.spacing.sm,
  },
  cancel: {
    ...theme.typography.small,
    color: theme.colors.textMuted,
  },
  disabled: {
    opacity: 0.55,
  },
});
