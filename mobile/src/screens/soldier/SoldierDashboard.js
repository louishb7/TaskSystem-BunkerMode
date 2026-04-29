import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../../api/client";
import { STATUS } from "../../utils/missionStatus";

function getErrorMessage(result, fallback) {
  if (result?.status === 0) {
    return "NAO FOI POSSIVEL CONECTAR A API.";
  }
  return result?.data?.detail || fallback;
}

export default function SoldierDashboard({ token, onLogout, onUserChange }) {
  const insets = useSafeAreaInsets();
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState(null);
  const [unlocking, setUnlocking] = useState(false);
  const [expandedMissionId, setExpandedMissionId] = useState(null);
  const [returnStep, setReturnStep] = useState("closed");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadMissions({ initial: true });
  }, [token]);

  const pendingMissions = useMemo(
    () =>
      missions.filter(
        (mission) =>
          mission?.status_code === STATUS.PENDENTE &&
          mission?.permissions?.can_complete === true
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
      setError(getErrorMessage(result, "NAO FOI POSSIVEL RECARREGAR USUARIO."));
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
      setError(getErrorMessage(result, "NAO FOI POSSIVEL CARREGAR MISSOES."));
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
      setError(getErrorMessage(result, "NAO FOI POSSIVEL CONCLUIR MISSAO."));
      await loadMissions();
      return;
    }

    setNotice("✔ EXECUTADO");
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
      setError(getErrorMessage(result, "GENERAL NEGADO."));
      return;
    }

    setSenha("");
    setReturnStep("closed");
    await reloadUser();
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>SOLDADO EM EXECUCAO</Text>
        <Text style={styles.text}>SINCRONIZANDO</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SOLDADO EM EXECUCAO</Text>
        <Text style={styles.meta}>{pendingMissions.length} MISSOES</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <FlatList
        contentContainerStyle={styles.listContent}
        data={pendingMissions}
        keyExtractor={(item, index) => String(item?.id ?? index)}
        ListEmptyComponent={<Text style={styles.text}>SEM MISSOES PENDENTES</Text>}
        renderItem={({ item }) => (
          <MissionRow
            completing={completingId === item?.id}
            expanded={expandedMissionId === item?.id}
            mission={item}
            onComplete={() => completeMission(item?.id)}
            onToggle={() =>
              setExpandedMissionId((current) => (current === item?.id ? null : item?.id))
            }
          />
        )}
      />

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable
          disabled={unlocking}
          onPress={() => setReturnStep("confirm")}
          style={styles.generalRequest}
        >
          <Text style={styles.generalRequestText}>SOLICITAR RETORNO AO GENERAL</Text>
        </Pressable>
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
                <Text style={styles.protocolText}>
                  Voce esta quebrando o protocolo de execucao.
                </Text>
                <View style={styles.protocolActions}>
                  <ProtocolButton
                    disabled={unlocking}
                    label="Cancelar"
                    onPress={() => {
                      setSenha("");
                      setReturnStep("closed");
                    }}
                  />
                  <ProtocolButton
                    disabled={unlocking}
                    label="Continuar"
                    onPress={() => setReturnStep("password")}
                  />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.protocolText}>SENHA DO GENERAL</Text>
                <TextInput
                  autoCapitalize="none"
                  onChangeText={setSenha}
                  placeholder="SENHA"
                  placeholderTextColor="#777777"
                  secureTextEntry
                  style={styles.input}
                  value={senha}
                />
                <View style={styles.protocolActions}>
                  <ProtocolButton
                    disabled={unlocking}
                    label="Cancelar"
                    onPress={() => {
                      setSenha("");
                      setReturnStep("closed");
                    }}
                  />
                  <ProtocolButton
                    disabled={unlocking}
                    label={unlocking ? "AGUARDE" : "CONTINUAR"}
                    onPress={returnToGeneral}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function MissionRow({ completing, expanded, mission, onComplete, onToggle }) {
  const title = mission?.titulo || "MISSAO";
  const instruction = mission?.instrucao || "";
  const shortInstruction = instruction.length > 96 ? `${instruction.slice(0, 93)}...` : instruction;
  const status = mission?.status_label || mission?.status_code || "PENDENTE";

  return (
    <View style={styles.mission}>
      <Pressable onPress={onToggle} style={styles.missionPress}>
        <Text numberOfLines={2} style={styles.text}>
          [ ] {title}
        </Text>
        {shortInstruction ? (
          <Text numberOfLines={expanded ? undefined : 2} style={styles.summary}>
            {shortInstruction}
          </Text>
        ) : null}
        <Text style={styles.status}>STATUS: {status}</Text>
        <Text style={styles.expandHint}>{expanded ? "RECOLHER" : "DETALHES"}</Text>
      </Pressable>

      {expanded ? (
        <View style={styles.detailBlock}>
          <Text style={styles.detailLabel}>INSTRUCAO</Text>
          <Text style={styles.detailText}>{instruction || "SEM INSTRUCAO"}</Text>
          {mission?.is_decided ? <Text style={styles.detailText}>COMPROMISSO DECIDIDO</Text> : null}
        </View>
      ) : null}

      <Pressable disabled={completing} onPress={onComplete} style={styles.button}>
        <Text style={styles.buttonText}>{completing ? "EXECUTANDO" : "CONCLUIR"}</Text>
      </Pressable>
    </View>
  );
}

function ProtocolButton({ disabled, label, onPress }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={styles.protocolButton}>
      <Text style={styles.protocolButtonText}>{label}</Text>
    </Pressable>
  );
}

const mono = "monospace";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    borderBottomColor: "#FFFFFF",
    borderBottomWidth: 1,
    paddingBottom: 14,
  },
  title: {
    color: "#00FF00",
    fontFamily: mono,
    fontSize: 18,
    letterSpacing: 1,
  },
  meta: {
    color: "#FFFFFF",
    fontFamily: mono,
    fontSize: 16,
    marginTop: 8,
  },
  text: {
    color: "#FFFFFF",
    fontFamily: mono,
    fontSize: 16,
    lineHeight: 22,
  },
  summary: {
    color: "#CCCCCC",
    fontFamily: mono,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  status: {
    color: "#777777",
    fontFamily: mono,
    fontSize: 12,
    marginTop: 8,
  },
  expandHint: {
    color: "#777777",
    fontFamily: mono,
    fontSize: 12,
    marginTop: 4,
  },
  detailBlock: {
    borderColor: "#777777",
    borderRadius: 0,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  detailLabel: {
    color: "#777777",
    fontFamily: mono,
    fontSize: 12,
    marginBottom: 8,
  },
  detailText: {
    color: "#FFFFFF",
    fontFamily: mono,
    fontSize: 14,
    lineHeight: 20,
  },
  error: {
    color: "#FFFFFF",
    fontFamily: mono,
    fontSize: 16,
    marginTop: 14,
  },
  notice: {
    color: "#00FF00",
    fontFamily: mono,
    fontSize: 16,
    marginTop: 14,
  },
  listContent: {
    paddingBottom: 20,
    paddingTop: 14,
  },
  mission: {
    borderBottomColor: "#FFFFFF",
    borderBottomWidth: 1,
    paddingBottom: 14,
    paddingTop: 14,
  },
  missionPress: {
    paddingBottom: 2,
  },
  button: {
    alignItems: "center",
    borderColor: "#FFFFFF",
    borderRadius: 0,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontFamily: mono,
    fontSize: 16,
  },
  footer: {
    borderTopColor: "#777777",
    borderTopWidth: 1,
    paddingBottom: 12,
    paddingTop: 12,
  },
  generalRequest: {
    alignItems: "center",
    borderColor: "#777777",
    borderRadius: 0,
    borderWidth: 1,
    padding: 8,
  },
  generalRequestText: {
    color: "#777777",
    fontFamily: mono,
    fontSize: 12,
  },
  overlay: {
    alignItems: "center",
    backgroundColor: "#000000",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    padding: 16,
    position: "absolute",
    right: 0,
    top: 0,
  },
  protocolBox: {
    borderColor: "#FFFFFF",
    borderRadius: 0,
    borderWidth: 1,
    padding: 16,
    width: "100%",
  },
  protocolText: {
    color: "#FFFFFF",
    fontFamily: mono,
    fontSize: 16,
    lineHeight: 22,
  },
  protocolActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  protocolButton: {
    alignItems: "center",
    borderColor: "#FFFFFF",
    borderRadius: 0,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  protocolButtonText: {
    color: "#FFFFFF",
    fontFamily: mono,
    fontSize: 16,
  },
  input: {
    borderColor: "#FFFFFF",
    borderRadius: 0,
    borderWidth: 1,
    color: "#FFFFFF",
    fontFamily: mono,
    fontSize: 16,
    marginTop: 16,
    padding: 12,
  },
});
