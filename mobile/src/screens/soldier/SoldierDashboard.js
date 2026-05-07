import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../../api/client";
import BrandSymbol from "../../components/BrandSymbol";
import EmptyState from "../../components/EmptyState";
import MissionCard from "../../components/MissionCard";
import ModeSwitchButton from "../../components/ModeSwitchButton";
import SoldierHeader from "../../components/SoldierHeader";
import StatusNotice from "../../components/StatusNotice";
import TacticalScreen from "../../components/TacticalScreen";
import { bunkerTheme as theme } from "../../theme/bunkermodeTheme";
import { STATUS } from "../../utils/missionStatus";

function getErrorMessage(result, fallback) {
  if (result?.status === 0) {
    return "Não foi possível conectar à API.";
  }
  return result?.data?.detail || fallback;
}

function formatCurrentDay() {
  try {
    return new Date()
      .toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
      })
      .toUpperCase();
  } catch {
    return "HOJE";
  }
}

export default function SoldierDashboard({ token, onLogout, onUserChange }) {
  const insets = useSafeAreaInsets();
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState(null);
  const [justifyingId, setJustifyingId] = useState(null);
  const [unlocking, setUnlocking] = useState(false);
  const [returnStep, setReturnStep] = useState("closed");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadMissions({ initial: true });
  }, [token]);

  const actionMissions = useMemo(
    () =>
      missions.filter(
        (mission) =>
          (mission?.status_code === STATUS.PENDENTE &&
            mission?.permissions?.can_complete === true) ||
          mission?.permissions?.can_justify === true
      ),
    [missions]
  );

  async function handleUnauthorized(result) {
    if (result?.status === 401) {
      await onLogout();
      return true;
    }
    return false;
  }

  async function reloadUser() {
    const result = await api.getCurrentUser(token);
    if (await handleUnauthorized(result)) {
      return false;
    }
    if (!result.ok) {
      setError(getErrorMessage(result, "Não foi possível recarregar o usuário."));
      return false;
    }
    await onUserChange(result.data);
    return true;
  }

  async function loadMissions({ initial = false } = {}) {
    if (initial) {
      setLoading(true);
    }

    const result = await api.listOperationalMissions(token);
    setLoading(false);

    if (await handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setError(getErrorMessage(result, "Não foi possível carregar missões."));
      return;
    }

    setMissions(result.data);
    setError("");
  }

  async function completeMission(missionId) {
    setCompletingId(missionId);
    setError("");
    setNotice("");

    const result = await api.completeMission(token, missionId);
    setCompletingId(null);

    if (await handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setError(getErrorMessage(result, "Não foi possível concluir a missão."));
      await loadMissions();
      return;
    }

    setNotice("EXECUTADO");
    await loadMissions();
  }

  async function justifyMission(missionId, payload) {
    setJustifyingId(missionId);
    setError("");
    setNotice("");

    const result = await api.submitFailureJustification(token, missionId, payload);
    setJustifyingId(null);

    if (await handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setError(getErrorMessage(result, "Não foi possível registrar a justificativa."));
      await loadMissions();
      return;
    }

    setNotice("JUSTIFICATIVA REGISTRADA");
    await loadMissions();
  }

  async function returnToGeneral() {
    setUnlocking(true);
    setError("");
    setNotice("");

    const result = await api.unlockGeneral(token, { senha });
    setUnlocking(false);

    if (await handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setError(getErrorMessage(result, "General negado."));
      return;
    }

    setSenha("");
    setReturnStep("closed");
    await reloadUser();
  }

  if (loading) {
    return (
      <TacticalScreen denseBackground variant="soldier">
        <View style={styles.loading}>
          <BrandSymbol size={82} />
          <Text style={styles.loadingTitle}>SOLDADO</Text>
          <Text style={styles.loadingText}>SINCRONIZANDO ORDENS</Text>
        </View>
      </TacticalScreen>
    );
  }

  return (
    <TacticalScreen denseBackground variant="soldier">
      <View
        style={[
          styles.content,
          {
            paddingBottom: Math.max(insets.bottom, 24) + theme.spacing.sm,
            paddingTop: Math.max(insets.top, 12),
          },
        ]}
      >
        <SoldierHeader
          currentDay={formatCurrentDay()}
          remainingCount={actionMissions.length}
          totalCount={missions.length || actionMissions.length}
        />

        <View style={styles.notices}>
          <StatusNotice type="error" message={error} />
          <StatusNotice type="info" message={notice} />
        </View>

        <FlatList
          contentContainerStyle={styles.listContent}
          data={actionMissions}
          keyExtractor={(item, index) => String(item?.id ?? index)}
          ListEmptyComponent={
            <EmptyState
              title="Sem ordens pendentes"
              message="Nenhuma missão operacional está disponível para execução agora."
            />
          }
          renderItem={({ item }) => (
            <MissionCard
              completing={completingId === item?.id}
              justifying={justifyingId === item?.id}
              mission={item}
              onComplete={() => completeMission(item?.id)}
              onJustify={(payload) => justifyMission(item?.id, payload)}
              variant="soldier"
            />
          )}
          style={styles.list}
        />

        <View style={styles.footer}>
          <ModeSwitchButton
            disabled={unlocking}
            loading={unlocking}
            mode="soldier"
            onPress={() => setReturnStep("confirm")}
          />
        </View>
      </View>

      {returnStep !== "closed" ? (
        <View
          style={[
            styles.overlay,
            {
              paddingBottom: Math.max(insets.bottom, 16),
              paddingTop: Math.max(insets.top, 16),
            },
          ]}
        >
          <View style={styles.protocolBox}>
            {returnStep === "confirm" ? (
              <>
                <Text style={styles.protocolKicker}>PROTOCOLO DE SAÍDA</Text>
                <Text style={styles.protocolText}>
                  Você está saindo do modo de execução. Confirme antes de retornar ao comando.
                </Text>
                <View style={styles.protocolActions}>
                  <ProtocolButton
                    disabled={unlocking}
                    label="CANCELAR"
                    onPress={() => {
                      setSenha("");
                      setReturnStep("closed");
                    }}
                  />
                  <ProtocolButton
                    danger
                    disabled={unlocking}
                    label="CONTINUAR"
                    onPress={() => setReturnStep("password")}
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.protocolKicker}>SENHA DO GENERAL</Text>
                <TextInput
                  autoCapitalize="none"
                  onChangeText={setSenha}
                  placeholder="SENHA"
                  placeholderTextColor={theme.colors.textDim}
                  secureTextEntry
                  style={styles.input}
                  value={senha}
                />
                <View style={styles.protocolActions}>
                  <ProtocolButton
                    disabled={unlocking}
                    label="CANCELAR"
                    onPress={() => {
                      setSenha("");
                      setReturnStep("closed");
                    }}
                  />
                  <ProtocolButton
                    danger
                    disabled={unlocking || !senha}
                    label={unlocking ? "AGUARDE" : "RETORNAR"}
                    onPress={returnToGeneral}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      ) : null}
    </TacticalScreen>
  );
}

function ProtocolButton({ danger = false, disabled, label, onPress }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.protocolButton, danger && styles.protocolButtonDanger, disabled && styles.disabled]}
    >
      <Text style={[styles.protocolButtonText, danger && styles.protocolButtonTextDanger]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    flex: 1,
    gap: theme.spacing.sm,
    justifyContent: "center",
  },
  loadingTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  loadingText: {
    ...theme.typography.small,
    color: theme.colors.red,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.md,
  },
  notices: {
    marginTop: theme.spacing.md,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  footer: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    paddingTop: theme.spacing.md,
  },
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.96)",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    padding: theme.spacing.screen,
    position: "absolute",
    right: 0,
    top: 0,
  },
  protocolBox: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.red,
    borderWidth: 1,
    padding: theme.spacing.lg,
    width: "100%",
  },
  protocolKicker: {
    ...theme.typography.small,
    color: theme.colors.red,
    marginBottom: theme.spacing.sm,
  },
  protocolText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  protocolActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  protocolButton: {
    alignItems: "center",
    borderColor: theme.colors.borderStrong,
    borderWidth: 1,
    flex: 1,
    minHeight: theme.layout.actionHeight,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.sm,
  },
  protocolButtonDanger: {
    backgroundColor: theme.colors.redWash,
    borderColor: theme.colors.red,
  },
  protocolButtonText: {
    ...theme.typography.label,
    color: theme.colors.textMuted,
  },
  protocolButtonTextDanger: {
    color: theme.colors.red,
  },
  input: {
    ...theme.typography.body,
    borderColor: theme.colors.red,
    borderWidth: 1,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
    minHeight: theme.layout.actionHeight,
    paddingHorizontal: theme.spacing.md,
  },
  disabled: {
    opacity: 0.45,
  },
});
