import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "./src/api/client";
import { clearSession, loadSession, saveSession, saveUser } from "./src/storage/sessionStorage";

const emptyStatus = { type: "muted", message: "" };

function getErrorMessage(result, fallback) {
  return result?.data?.detail || fallback;
}

function LoginScreen({ loading, status, onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.centerScreen}
    >
      <View style={styles.panel}>
        <Text style={styles.kicker}>BunkerMode</Text>
        <Text style={styles.title}>Soldado</Text>
        <Text style={styles.copy}>Entre para executar as ordens ja decididas.</Text>

        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="email"
          style={styles.input}
          value={email}
        />
        <TextInput
          autoCapitalize="none"
          onChangeText={setSenha}
          placeholder="senha"
          secureTextEntry
          style={styles.input}
          value={senha}
        />

        {status.message ? <Text style={styles.feedback}>{status.message}</Text> : null}

        <Pressable
          disabled={loading}
          onPress={() => onLogin({ email: email.trim(), senha })}
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || loading) && styles.buttonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>{loading ? "Entrando..." : "Entrar"}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function SoldierGate({ user, loading, status, onActivate, onLogout }) {
  return (
    <View style={styles.centerScreen}>
      <View style={styles.panel}>
        <Text style={styles.kicker}>Modo atual</Text>
        <Text style={styles.title}>General</Text>
        <Text style={styles.copy}>
          Este cliente mobile executa apenas o modo Soldado. Ative o Soldado para carregar as
          ordens operacionais.
        </Text>
        <Text style={styles.operator}>Conta: {user?.usuario}</Text>
        {status.message ? <Text style={styles.feedback}>{status.message}</Text> : null}
        <Pressable
          disabled={loading}
          onPress={onActivate}
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || loading) && styles.buttonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? "Ativando..." : "Ativar Soldado"}
          </Text>
        </Pressable>
        <Pressable onPress={onLogout} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Sair</Text>
        </Pressable>
      </View>
    </View>
  );
}

function MissionCard({
  mission,
  busy,
  excuseDraft,
  onChangeExcuse,
  onComplete,
  onJustify,
}) {
  const canComplete = Boolean(mission.permissions?.can_complete);
  const canJustify = Boolean(mission.permissions?.can_justify);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.missionTitle}>{mission.titulo}</Text>
        <Text style={styles.statusBadge}>{mission.status_label}</Text>
      </View>
      <Text style={styles.instruction}>{mission.instrucao}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>Prioridade {mission.prioridade}</Text>
        <Text style={styles.meta}>{mission.prazo || "Sem prazo"}</Text>
      </View>

      {canComplete ? (
        <Pressable
          disabled={busy}
          onPress={() => onComplete(mission.id)}
          style={({ pressed }) => [
            styles.primaryButton,
            styles.cardAction,
            (pressed || busy) && styles.buttonPressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>{busy ? "Enviando..." : "Concluir"}</Text>
        </Pressable>
      ) : null}

      {canJustify ? (
        <View style={styles.justificationBox}>
          <Text style={styles.justificationLabel}>Justificativa</Text>
          <TextInput
            multiline
            onChangeText={(value) => onChangeExcuse(mission.id, value)}
            placeholder="Explique o que aconteceu"
            style={[styles.input, styles.textArea]}
            value={excuseDraft}
          />
          <Pressable
            disabled={busy}
            onPress={() => onJustify(mission.id)}
            style={({ pressed }) => [
              styles.primaryButton,
              styles.cardAction,
              (pressed || busy) && styles.buttonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {busy ? "Enviando..." : "Enviar justificativa"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function SoldierHome({
  user,
  missions,
  loading,
  refreshing,
  busyMissionId,
  status,
  excuseDrafts,
  onRefresh,
  onLogout,
  onComplete,
  onJustify,
  onChangeExcuse,
}) {
  const missionCountLabel = useMemo(() => {
    if (missions.length === 1) {
      return "1 ordem operacional";
    }
    return `${missions.length} ordens operacionais`;
  }, [missions.length]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>Modo Soldado</Text>
          <Text style={styles.title}>Em campo</Text>
          <Text style={styles.copy}>{missionCountLabel}</Text>
        </View>
        <Pressable onPress={onLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sair</Text>
        </Pressable>
      </View>
      <Text style={styles.operator}>Conta: {user?.usuario}</Text>
      {status.message ? <Text style={styles.feedback}>{status.message}</Text> : null}

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator />
          <Text style={styles.meta}>Carregando ordens...</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={missions}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Nenhuma ordem para executar agora.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <MissionCard
              busy={busyMissionId === item.id}
              excuseDraft={excuseDrafts[item.id] || ""}
              mission={item}
              onChangeExcuse={onChangeExcuse}
              onComplete={onComplete}
              onJustify={onJustify}
            />
          )}
        />
      )}
    </View>
  );
}

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [missions, setMissions] = useState([]);
  const [booting, setBooting] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [modeLoading, setModeLoading] = useState(false);
  const [missionLoading, setMissionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyMissionId, setBusyMissionId] = useState(null);
  const [status, setStatus] = useState(emptyStatus);
  const [authStatus, setAuthStatus] = useState(emptyStatus);
  const [excuseDrafts, setExcuseDrafts] = useState({});

  const authenticated = Boolean(token && user);
  const soldierMode = user?.active_mode === "soldier";

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (authenticated && soldierMode) {
      loadMissions();
    }
  }, [authenticated, soldierMode]);

  async function restoreSession() {
    const session = await loadSession();
    setToken(session.token);
    setUser(session.user);
    setBooting(false);
  }

  async function persistAuthenticatedSession(nextToken, nextUser) {
    setToken(nextToken);
    setUser(nextUser);
    await saveSession(nextToken, nextUser);
  }

  async function persistUser(nextUser) {
    setUser(nextUser);
    await saveUser(nextUser);
  }

  async function logout() {
    await clearSession();
    setToken(null);
    setUser(null);
    setMissions([]);
    setExcuseDrafts({});
    setStatus(emptyStatus);
    setAuthStatus(emptyStatus);
  }

  function handleUnauthorized(result) {
    if (result.status === 401) {
      logout();
      setAuthStatus({ type: "error", message: "Sessao expirada. Faca login novamente." });
      return true;
    }
    return false;
  }

  async function login(payload) {
    if (!payload.email || !payload.senha) {
      setAuthStatus({ type: "error", message: "Preencha email e senha." });
      return;
    }

    setAuthLoading(true);
    setAuthStatus({ type: "muted", message: "Autenticando..." });
    const result = await api.login(payload);
    setAuthLoading(false);

    if (!result.ok) {
      setAuthStatus({
        type: "error",
        message: getErrorMessage(result, "Nao foi possivel entrar."),
      });
      return;
    }

    await persistAuthenticatedSession(result.data.access_token, result.data.usuario);
    setAuthStatus(emptyStatus);
  }

  async function activateSoldierMode() {
    setModeLoading(true);
    setStatus({ type: "muted", message: "Ativando modo Soldado..." });
    const result = await api.activateSoldierMode(token);
    setModeLoading(false);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setStatus({
        type: "error",
        message: getErrorMessage(result, "Nao foi possivel ativar o Soldado."),
      });
      return;
    }

    await persistUser(result.data);
    setStatus(emptyStatus);
  }

  async function loadMissions({ asRefresh = false } = {}) {
    if (asRefresh) {
      setRefreshing(true);
    } else {
      setMissionLoading(true);
    }
    const result = await api.listOperationalMissions(token);
    setRefreshing(false);
    setMissionLoading(false);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setStatus({
        type: "error",
        message: getErrorMessage(result, "Nao foi possivel carregar as ordens."),
      });
      return;
    }

    setMissions(result.data);
    setStatus(emptyStatus);
  }

  async function completeMission(missionId) {
    setBusyMissionId(missionId);
    const result = await api.completeMission(token, missionId);
    setBusyMissionId(null);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setStatus({
        type: "error",
        message: getErrorMessage(result, "Nao foi possivel concluir a missao."),
      });
      await loadMissions();
      return;
    }

    await loadMissions();
  }

  async function submitJustification(missionId) {
    const reason = (excuseDrafts[missionId] || "").trim();
    if (!reason) {
      setStatus({ type: "error", message: "Informe a justificativa antes de continuar." });
      return;
    }

    setBusyMissionId(missionId);
    const result = await api.submitJustification(token, missionId, reason);
    setBusyMissionId(null);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setStatus({
        type: "error",
        message: getErrorMessage(result, "Nao foi possivel enviar a justificativa."),
      });
      await loadMissions();
      return;
    }

    setExcuseDrafts((current) => {
      const next = { ...current };
      delete next[missionId];
      return next;
    });
    await loadMissions();
  }

  function changeExcuse(missionId, value) {
    setExcuseDrafts((current) => ({
      ...current,
      [missionId]: value,
    }));
  }

  if (booting) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerScreen}>
          <ActivityIndicator />
          <Text style={styles.meta}>Abrindo BunkerMode...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {!authenticated ? (
        <LoginScreen loading={authLoading} status={authStatus} onLogin={login} />
      ) : !soldierMode ? (
        <SoldierGate
          loading={modeLoading}
          status={status}
          user={user}
          onActivate={activateSoldierMode}
          onLogout={logout}
        />
      ) : (
        <SoldierHome
          busyMissionId={busyMissionId}
          excuseDrafts={excuseDrafts}
          loading={missionLoading}
          missions={missions}
          refreshing={refreshing}
          status={status}
          user={user}
          onChangeExcuse={changeExcuse}
          onComplete={completeMission}
          onJustify={submitJustification}
          onLogout={logout}
          onRefresh={() => loadMissions({ asRefresh: true })}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f1eb",
  },
  centerScreen: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  panel: {
    borderColor: "#24211d",
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: "#fffaf1",
    padding: 20,
    gap: 14,
  },
  kicker: {
    color: "#6d6254",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: {
    color: "#171512",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 0,
  },
  copy: {
    color: "#50483e",
    fontSize: 15,
    lineHeight: 21,
  },
  input: {
    minHeight: 48,
    borderColor: "#b8aa97",
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: "#ffffff",
    color: "#171512",
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  primaryButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    backgroundColor: "#171512",
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  buttonPressed: {
    opacity: 0.68,
  },
  secondaryButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#b8aa97",
    borderRadius: 4,
    borderWidth: 1,
  },
  secondaryButtonText: {
    color: "#171512",
    fontSize: 15,
    fontWeight: "700",
  },
  feedback: {
    color: "#8b2f25",
    fontSize: 14,
    lineHeight: 20,
  },
  operator: {
    color: "#6d6254",
    fontSize: 13,
    marginTop: 6,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 6,
  },
  headerText: {
    flex: 1,
  },
  logoutButton: {
    borderColor: "#b8aa97",
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  logoutText: {
    color: "#171512",
    fontSize: 13,
    fontWeight: "700",
  },
  loadingBox: {
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 40,
  },
  listContent: {
    gap: 12,
    paddingBottom: 28,
    paddingTop: 16,
  },
  card: {
    borderColor: "#d2c5b3",
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: "#fffaf1",
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    alignItems: "flex-start",
    gap: 8,
  },
  missionTitle: {
    color: "#171512",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 23,
  },
  statusBadge: {
    alignSelf: "flex-start",
    borderColor: "#b8aa97",
    borderRadius: 4,
    borderWidth: 1,
    color: "#50483e",
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  instruction: {
    color: "#38332d",
    fontSize: 15,
    lineHeight: 21,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  meta: {
    color: "#6d6254",
    fontSize: 13,
  },
  cardAction: {
    marginTop: 2,
  },
  justificationBox: {
    gap: 8,
  },
  justificationLabel: {
    color: "#171512",
    fontSize: 13,
    fontWeight: "800",
  },
  emptyState: {
    alignItems: "center",
    borderColor: "#d2c5b3",
    borderRadius: 6,
    borderWidth: 1,
    padding: 18,
  },
  emptyTitle: {
    color: "#50483e",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
});
