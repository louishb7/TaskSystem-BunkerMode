import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../../api/client";
import ModeSwitcher from "../../components/ModeSwitcher";
import { STATUS } from "../../utils/missionStatus";

function getErrorMessage(result, fallback) {
  if (result?.status === 0) {
    return "NÃO FOI POSSÍVEL CONECTAR À API.";
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
      setError(getErrorMessage(result, "NÃO FOI POSSÍVEL RECARREGAR O USUÁRIO."));
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
      setError(getErrorMessage(result, "NÃO FOI POSSÍVEL CARREGAR MISSÕES."));
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
      setError(getErrorMessage(result, "NÃO FOI POSSÍVEL CONCLUIR A MISSÃO."));
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
        <BunkerTexture />
        <View style={styles.scrim}>
        <Text style={styles.title}>SOLDADO EM EXECUÇÃO</Text>
        <Text style={styles.text}>SINCRONIZANDO</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BunkerTexture />
      <View style={styles.scrim}>
      <View style={styles.header}>
        <Text style={styles.title}>SOLDADO</Text>
        <Text style={styles.meta}>EXECUÇÃO APENAS / {pendingMissions.length} MISSÕES</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <FlatList
        contentContainerStyle={styles.listContent}
        data={pendingMissions}
        keyExtractor={(item, index) => String(item?.id ?? index)}
        ListEmptyComponent={<Text style={styles.text}>SEM MISSÕES PENDENTES</Text>}
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
        <ModeSwitcher
          disabled={unlocking}
          mode="soldier"
          onPress={() => setReturnStep("confirm")}
          pending={unlocking}
        />
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
                  Você está quebrando o protocolo de execução.
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
                    disabled={unlocking}
                    label="CONTINUAR"
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
                    label="CANCELAR"
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
    </View>
  );
}

function MissionRow({ completing, expanded, mission, onComplete, onToggle }) {
  const title = mission?.titulo || "MISSÃO";
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
          <Text style={styles.detailText}>{instruction || "SEM INSTRUÇÃO"}</Text>
          {mission?.is_decided ? <Text style={styles.detailText}>COMPROMISSO DECIDIDO</Text> : null}
        </View>
      ) : null}

      <Pressable disabled={completing} onPress={onComplete} style={styles.button}>
        <Text style={styles.buttonText}>{completing ? "EXECUTANDO" : "CONCLUIR"}</Text>
      </Pressable>
    </View>
  );
}

function BunkerTexture() {
  return (
    <View pointerEvents="none" style={styles.texture}>
      {Array.from({ length: 9 }).map((_, index) => (
        <View
          key={String(index)}
          style={[
            styles.textureLine,
            {
              left: `${index * 13}%`,
              opacity: index % 3 === 0 ? 0.1 : 0.05,
            },
          ]}
        />
      ))}
      <View style={styles.textureFrame} />
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
  },
  texture: {
    bottom: -24,
    left: -24,
    opacity: 0.9,
    position: "absolute",
    right: -24,
    top: -24,
    transform: [{ rotate: "-4deg" }],
  },
  textureLine: {
    backgroundColor: "#EDEDED",
    bottom: 0,
    position: "absolute",
    top: 0,
    width: 1,
  },
  textureFrame: {
    borderColor: "rgba(237,237,237,0.045)",
    borderWidth: 1,
    bottom: 36,
    left: 28,
    position: "absolute",
    right: 28,
    top: 36,
  },
  scrim: {
    backgroundColor: "rgba(0,0,0,0.94)",
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    borderBottomColor: "#3A3A3A",
    borderBottomWidth: 1,
    paddingBottom: 14,
  },
  title: {
    color: "#EDEDED",
    fontFamily: mono,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0,
  },
  meta: {
    color: "#FF2A2A",
    fontFamily: mono,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },
  text: {
    color: "#EDEDED",
    fontFamily: mono,
    fontSize: 16,
    lineHeight: 22,
  },
  summary: {
    color: "#A8A8A8",
    fontFamily: mono,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  status: {
    color: "#666666",
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
    borderColor: "#3A3A3A",
    borderRadius: 0,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  detailLabel: {
    color: "#FF2A2A",
    fontFamily: mono,
    fontSize: 12,
    marginBottom: 8,
  },
  detailText: {
    color: "#EDEDED",
    fontFamily: mono,
    fontSize: 14,
    lineHeight: 20,
  },
  error: {
    color: "#FF2A2A",
    fontFamily: mono,
    fontSize: 16,
    marginTop: 14,
  },
  notice: {
    color: "#EDEDED",
    fontFamily: mono,
    fontSize: 16,
    marginTop: 14,
  },
  listContent: {
    paddingBottom: 20,
    paddingTop: 14,
  },
  mission: {
    borderBottomColor: "#2A2A2A",
    borderBottomWidth: 1,
    paddingBottom: 14,
    paddingTop: 14,
  },
  missionPress: {
    paddingBottom: 2,
  },
  button: {
    alignItems: "center",
    backgroundColor: "#FF2A2A",
    borderColor: "#FF2A2A",
    borderRadius: 0,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  buttonText: {
    color: "#000000",
    fontFamily: mono,
    fontSize: 16,
    fontWeight: "900",
  },
  footer: {
    borderTopColor: "#2A2A2A",
    borderTopWidth: 1,
    paddingBottom: 12,
    paddingTop: 12,
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
    borderColor: "#FF2A2A",
    borderRadius: 0,
    borderWidth: 1,
    padding: 16,
    width: "100%",
  },
  protocolText: {
    color: "#EDEDED",
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
    borderColor: "#3A3A3A",
    borderRadius: 0,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  protocolButtonText: {
    color: "#EDEDED",
    fontFamily: mono,
    fontSize: 16,
  },
  input: {
    borderColor: "#FF2A2A",
    borderRadius: 0,
    borderWidth: 1,
    color: "#EDEDED",
    fontFamily: mono,
    fontSize: 16,
    marginTop: 16,
    padding: 12,
  },
});
