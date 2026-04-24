import React, { useEffect, useMemo, useState } from "react";
import { api } from "./api/client.js";
import AuthScreen from "./components/AuthScreen.jsx";
import GeneralReviewPanel from "./components/GeneralReviewPanel.jsx";
import MissionForm from "./components/MissionForm.jsx";
import MissionList from "./components/MissionList.jsx";
import MissionToolbar from "./components/MissionToolbar.jsx";
import WeeklyReportPanel from "./components/WeeklyReportPanel.jsx";
import { formatDateTime } from "./utils/date.js";
import {
  isCompleted,
  isFinalizedMission,
  requiresSoldierJustification,
} from "./utils/missionStatus.js";

const TOKEN_KEY = "bunkermode_token";
const USER_KEY = "bunkermode_usuario";

const emptyStatus = { type: "muted", message: "" };

function readStoredUser() {
  const rawUser = localStorage.getItem(USER_KEY);
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

function filterMissions(missions, filters) {
  const search = filters.search.trim().toLowerCase();
  let filtered = [...missions];

  if (search) {
    filtered = filtered.filter((mission) => {
      const content = `${mission.titulo} ${mission.instrucao}`.toLowerCase();
      return content.includes(search);
    });
  }

  if (filters.status === "pendente") {
    filtered = filtered.filter((mission) => !isCompleted(mission));
  }

  if (filters.status === "concluida") {
    filtered = filtered.filter(isCompleted);
  }

  if (filters.decided === "decididas") {
    filtered = filtered.filter((mission) => mission.is_decided);
  }

  if (filters.decided === "nao_decididas") {
    filtered = filtered.filter((mission) => !mission.is_decided);
  }

  filtered.sort((a, b) => {
    if (a.is_decided !== b.is_decided) {
      return a.is_decided ? -1 : 1;
    }

    if (filters.sort === "titulo") {
      return a.titulo.localeCompare(b.titulo, "pt-BR");
    }

    if (filters.sort === "prazo") {
      return String(a.prazo || "").localeCompare(String(b.prazo || ""), "pt-BR");
    }

    return Number(a.prioridade) - Number(b.prioridade);
  });

  return filtered;
}

function withDisplayIds(missions) {
  return missions.map((mission, index) => ({
    ...mission,
    displayId: index + 1,
  }));
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(readStoredUser);
  const [missions, setMissions] = useState([]);
  const [reviewMissions, setReviewMissions] = useState([]);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [editingMission, setEditingMission] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    status: "todas",
    decided: "todas",
    sort: "prioridade",
  });
  const [authModeLoading, setAuthModeLoading] = useState(false);
  const [missionLoading, setMissionLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [decisionLoadingId, setDecisionLoadingId] = useState(null);
  const [generalNameLoading, setGeneralNameLoading] = useState(false);
  const [generalNameDraft, setGeneralNameDraft] = useState("");
  const [profileReady, setProfileReady] = useState(() => !Boolean(localStorage.getItem(TOKEN_KEY)));
  const [generalModalDismissed, setGeneralModalDismissed] = useState(false);
  const [showSoldierConfirm, setShowSoldierConfirm] = useState(false);
  const [showUnlockGeneral, setShowUnlockGeneral] = useState(false);
  const [sessionModeLoading, setSessionModeLoading] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [excuseDrafts, setExcuseDrafts] = useState({});
  const [excuseLoading, setExcuseLoading] = useState(false);
  const [verdictLoadingId, setVerdictLoadingId] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);
  const [authStatus, setAuthStatus] = useState(emptyStatus);
  const [missionStatus, setMissionStatus] = useState(emptyStatus);
  const [formStatus, setFormStatus] = useState(emptyStatus);
  const [generalStatus, setGeneralStatus] = useState(emptyStatus);
  const [sessionStatus, setSessionStatus] = useState(emptyStatus);

  const authenticated = Boolean(token && user);
  const generalNameRequired =
    authenticated && profileReady && !user?.nome_general && !generalModalDismissed;
  const activeMode = user?.active_mode || "general";
  const soldierMode = activeMode === "soldier";

  const visibleMissions = useMemo(
    () => filterMissions(missions, filters),
    [missions, filters]
  );
  const pendingSoldierExcuses = useMemo(
    () =>
      soldierMode
        ? missions.filter((mission) => requiresSoldierJustification(mission) && !isCompleted(mission))
        : [],
    [missions, soldierMode]
  );
  const boardMissions = useMemo(
    () => (
      soldierMode
        ? visibleMissions.filter(
            (mission) => !requiresSoldierJustification(mission) && !isFinalizedMission(mission)
          )
        : visibleMissions
    ),
    [soldierMode, visibleMissions]
  );

  const totals = useMemo(() => {
    const completed = missions.filter(isCompleted).length;
    return {
      all: missions.length,
      pending: missions.length - completed,
      completed,
    };
  }, [missions]);

  useEffect(() => {
    if (authenticated) {
      setProfileReady(false);
      loadCurrentUser();
      loadMissions();
      loadReviewMissions();
      if (!soldierMode && showWeeklyReport) {
        loadWeeklyReport();
      }
    }
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated) {
      return;
    }
    if (soldierMode) {
      setReviewMissions([]);
      setShowWeeklyReport(false);
      return;
    }
    loadReviewMissions();
    if (showWeeklyReport) {
      loadWeeklyReport();
    }
  }, [authenticated, soldierMode, showWeeklyReport]);

  useEffect(() => {
    setGeneralNameDraft(user?.nome_general || "");
  }, [user?.nome_general]);

  useEffect(() => {
    if (user?.nome_general) {
      setGeneralModalDismissed(false);
    }
  }, [user?.nome_general]);

  function persistUser(nextUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setMissions([]);
    setReviewMissions([]);
    setWeeklyReport(null);
    setShowWeeklyReport(false);
    setEditingMission(null);
    setMissionStatus(emptyStatus);
    setFormStatus(emptyStatus);
    setGeneralStatus(emptyStatus);
    setSessionStatus(emptyStatus);
    setProfileReady(true);
    setGeneralModalDismissed(false);
    setShowSoldierConfirm(false);
    setShowUnlockGeneral(false);
    setUnlockPassword("");
    setExcuseDrafts({});
  }

  function handleUnauthorized(result) {
    if (result.status === 401) {
      clearSession();
      setAuthStatus({ type: "error", message: "Sessão expirada. Faça login novamente." });
      return true;
    }
    return false;
  }

  async function login(payload) {
    if (!payload.email || !payload.senha) {
      setAuthStatus({ type: "error", message: "Preencha email e senha." });
      return;
    }

    setAuthModeLoading(true);
    setAuthStatus({ type: "warning", message: "Autenticando..." });
    const result = await api.login(payload);
    setAuthModeLoading(false);

    if (!result.ok) {
      setAuthStatus({ type: "error", message: `Erro ao entrar: ${result.data.detail}` });
      return;
    }

    localStorage.setItem(TOKEN_KEY, result.data.access_token);
    setToken(result.data.access_token);
    persistUser(result.data.usuario);
    setProfileReady(true);
    setGeneralModalDismissed(false);
    setAuthStatus(emptyStatus);
  }

  async function register(payload) {
    if (!payload.usuario || !payload.email || !payload.senha) {
      setAuthStatus({ type: "error", message: "Preencha usuário, email e senha." });
      return;
    }

    setAuthModeLoading(true);
    setAuthStatus({ type: "warning", message: "Criando conta..." });
    const result = await api.register(payload);
    setAuthModeLoading(false);

    if (!result.ok) {
      setAuthStatus({ type: "error", message: `Erro ao criar conta: ${result.data.detail}` });
      return;
    }

    setAuthStatus({ type: "success", message: "Conta criada. Faça login para entrar." });
  }

  async function loadMissions(successMessage = "") {
    if (!token) {
      return;
    }

    setMissionLoading(true);
    const result = await api.listMissions(token);
    setMissionLoading(false);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setMissionStatus({ type: "error", message: `Erro ao carregar missões: ${result.data.detail}` });
      return;
    }

    setMissions(withDisplayIds(result.data));
    setMissionStatus({
      type: successMessage ? "success" : "muted",
      message: successMessage || `${result.data.length} missão(ões) carregada(s).`,
    });
  }

  async function loadReviewMissions() {
    if (!token || soldierMode) {
      return;
    }

    setReviewLoading(true);
    const result = await api.listReviewMissions(token);
    setReviewLoading(false);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setMissionStatus({
        type: "error",
        message: `Erro ao carregar revisão do General: ${result.data.detail}`,
      });
      return;
    }

    setReviewMissions(result.data);
  }

  async function loadWeeklyReport() {
    if (!token || soldierMode) {
      return;
    }

    setReportLoading(true);
    const result = await api.getWeeklyReport(token);
    setReportLoading(false);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setMissionStatus({
        type: "error",
        message: `Erro ao carregar relatório semanal: ${result.data.detail}`,
      });
      return;
    }

    setWeeklyReport(result.data);
  }

  async function loadCurrentUser() {
    const result = await api.getCurrentUser(token);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setProfileReady(true);
      return;
    }

    persistUser(result.data);
    setProfileReady(true);
  }

  async function saveGeneralName(event) {
    event.preventDefault();
    const trimmedName = generalNameDraft.trim();

    if (!trimmedName) {
      setGeneralStatus({ type: "error", message: "Informe o nome do General." });
      return;
    }

    setGeneralNameLoading(true);
    setGeneralStatus({ type: "warning", message: "Registrando o nome do General..." });
    const result = await api.saveGeneralName(token, { nome_general: trimmedName });
    setGeneralNameLoading(false);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setGeneralStatus({
        type: "error",
        message:
          result.status === 404
            ? "A rota para salvar o nome de guerra não está disponível nesta API ativa. Atualize ou reinicie o backend."
            : `Erro ao salvar o nome do General: ${result.data.detail}`,
      });
      return;
    }

    persistUser(result.data);
    setGeneralStatus(emptyStatus);
    setMissionStatus({
      type: "success",
      message: `General ${result.data.nome_general} pronto para operar.`,
    });
  }

  async function activateSoldierMode() {
    setSessionModeLoading(true);
    setSessionStatus({ type: "warning", message: "Ativando o modo Soldado..." });
    const result = await api.setSessionMode(token, { mode: "soldier" });
    setSessionModeLoading(false);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setSessionStatus({
        type: "error",
        message: `Erro ao ativar o Soldado: ${result.data.detail}`,
      });
      return;
    }

    persistUser(result.data);
    setEditingMission(null);
    setShowSoldierConfirm(false);
    setSessionStatus({
      type: "success",
      message: "Modo Soldado ativo. Planejamento bloqueado até nova liberação.",
    });
    await loadMissions();
  }

  async function unlockGeneral(event) {
    event.preventDefault();
    if (!unlockPassword.trim()) {
      setSessionStatus({ type: "error", message: "Informe a senha para liberar o General." });
      return;
    }

    setSessionModeLoading(true);
    setSessionStatus({ type: "warning", message: "Validando senha do General..." });
    const result = await api.unlockGeneral(token, { senha: unlockPassword });
    setSessionModeLoading(false);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setSessionStatus({
        type: "error",
        message:
          result.status === 401
            ? "Senha incorreta. O modo Soldado permanece ativo."
            : `Erro ao liberar o General: ${result.data.detail}`,
      });
      return;
    }

    persistUser(result.data);
    setUnlockPassword("");
    setShowUnlockGeneral(false);
    setSessionStatus({
      type: "success",
      message: "General liberado. Planejamento reativado.",
    });
    await loadMissions();
    await loadReviewMissions();
    if (showWeeklyReport) {
      await loadWeeklyReport();
    }
  }

  async function createMission(payload) {
    if (!payload.titulo || !payload.instrucao) {
      setFormStatus({ type: "error", message: "Preencha título e instrução." });
      return;
    }

    setFormLoading(true);
    setFormStatus({ type: "warning", message: "Criando missão..." });
    const result = await api.createMission(token, payload);
    setFormLoading(false);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setFormStatus({ type: "error", message: `Erro ao criar missão: ${result.data.detail}` });
      return;
    }

    setFormStatus({ type: "success", message: "Missão criada com sucesso." });
    await loadMissions("Missão criada e lista atualizada.");
    if (showWeeklyReport) {
      await loadWeeklyReport();
    }
  }

  async function updateMission(missionId, payload) {
    if (!payload.titulo || !payload.instrucao) {
      setFormStatus({ type: "error", message: "Preencha título e instrução." });
      return;
    }

    setFormLoading(true);
    setFormStatus({ type: "warning", message: "Salvando edição..." });
    const result = await api.updateMission(token, missionId, payload);
    setFormLoading(false);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setFormStatus({ type: "error", message: `Erro ao editar missão: ${result.data.detail}` });
      return;
    }

    setEditingMission(null);
    setFormStatus({ type: "success", message: "Missão atualizada com sucesso." });
    await loadMissions("Missão atualizada.");
    await loadReviewMissions();
    if (showWeeklyReport) {
      await loadWeeklyReport();
    }
  }

  async function completeMission(missionId) {
    const result = await api.completeMission(token, missionId);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setMissionStatus({ type: "error", message: `Erro ao concluir missão: ${result.data.detail}` });
      return;
    }

    await loadMissions("Missão concluída.");
    if (showWeeklyReport) {
      await loadWeeklyReport();
    }
  }

  async function toggleMissionDecision(missionId) {
    const previousMissions = missions;

    setDecisionLoadingId(missionId);
    setMissions((current) =>
      current.map((mission) =>
        mission.id === missionId
          ? { ...mission, is_decided: !mission.is_decided }
          : mission
      )
    );

    const result = await api.toggleMissionDecision(token, missionId);
    setDecisionLoadingId(null);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setMissions(previousMissions);
      setMissionStatus({
        type: "error",
        message: `Erro ao atualizar decisão: ${result.data.detail}`,
      });
      return;
    }

    setMissions((current) =>
      current.map((mission) =>
        mission.id === missionId ? { ...mission, ...result.data } : mission
      )
    );
    setMissionStatus({
      type: "success",
      message: result.data.is_decided
        ? "Missão marcada como decidida."
        : "Missão voltou ao estado normal.",
    });
    if (showWeeklyReport) {
      await loadWeeklyReport();
    }
  }

  async function deleteMission(missionId) {
    const confirmed = window.confirm(`Deseja apagar a missão ${missionId}?`);
    if (!confirmed) {
      return;
    }

    const result = await api.deleteMission(token, missionId);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setMissionStatus({ type: "error", message: `Erro ao apagar missão: ${result.data.detail}` });
      return;
    }

    if (editingMission?.id === missionId) {
      setEditingMission(null);
    }

    await loadMissions("Missão apagada.");
    await loadReviewMissions();
    if (showWeeklyReport) {
      await loadWeeklyReport();
    }
  }

  function updateExcuseDraft(missionId, value) {
    setExcuseDrafts((current) => ({
      ...current,
      [missionId]: value,
    }));
  }

  async function submitSoldierExcuse(missionId) {
    const targetMission = pendingSoldierExcuses.find((mission) => mission.id === missionId);
    if (!targetMission) {
      return;
    }

    const reason = (excuseDrafts[missionId] || "").trim();
    if (!reason) {
      setMissionStatus({ type: "error", message: "Explique o motivo da falha antes de seguir." });
      return;
    }

    setExcuseLoading(true);
    const result = await api.submitSoldierExcuse(token, missionId, { reason });
    setExcuseLoading(false);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setMissionStatus({
        type: "error",
        message: `Erro ao registrar justificativa: ${result.data.detail}`,
      });
      return;
    }

    setExcuseDrafts((current) => {
      const next = { ...current };
      delete next[missionId];
      return next;
    });
    await loadMissions("Justificativa registrada. A missão saiu do registro diário do Soldado.");
  }

  async function submitGeneralReview(missionId, accepted) {
    setVerdictLoadingId(missionId);
    const result = await api.submitGeneralReview(token, missionId, { accepted });
    setVerdictLoadingId(null);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setMissionStatus({
        type: "error",
        message: `Erro ao registrar julgamento: ${result.data.detail}`,
      });
      return;
    }

    await loadMissions(
      accepted
        ? "General aceitou a justificativa da falha."
        : "General rejeitou a justificativa da falha."
    );
    await loadReviewMissions();
    if (showWeeklyReport) {
      await loadWeeklyReport();
    }
  }

  async function loadHistory(missionId) {
    const targetMission = missions.find((mission) => mission.id === missionId);
    if (!targetMission) {
      return;
    }

    if (targetMission.historyOpen && !targetMission.historyLoading) {
      setMissions((current) =>
        current.map((mission) =>
          mission.id === missionId
            ? { ...mission, historyOpen: false, historyError: "" }
            : mission
        )
      );
      return;
    }

    if (targetMission.history && targetMission.history.length) {
      setMissions((current) =>
        current.map((mission) =>
          mission.id === missionId
            ? { ...mission, historyOpen: true, historyError: "" }
            : mission
        )
      );
      return;
    }

    setMissions((current) =>
      current.map((mission) =>
        mission.id === missionId
          ? {
              ...mission,
              historyOpen: true,
              historyLoading: true,
              historyError: "",
            }
          : mission
      )
    );

    const result = await api.getMissionHistory(token, missionId);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setMissions((current) =>
        current.map((mission) =>
          mission.id === missionId
            ? {
                ...mission,
                historyOpen: true,
                historyLoading: false,
                historyError: `Não foi possível carregar o histórico: ${result.data.detail}`,
              }
            : mission
        )
      );
      return;
    }

    setMissions((current) =>
      current.map((mission) =>
        mission.id === missionId
          ? {
              ...mission,
              history: result.data,
              historyOpen: true,
              historyLoading: false,
              historyError: "",
            }
          : mission
      )
    );
  }

  if (!authenticated) {
    return (
      <AuthScreen
        onLogin={login}
        onRegister={register}
        status={authStatus}
        loading={authModeLoading}
      />
    );
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="app-header-main">
          <div className="app-brand-block">
            <p className="eyebrow">BunkerMode</p>
            <h1 className={soldierMode ? "soldier-heading" : ""}>
              {soldierMode ? "Em campo!" : `General ${user.nome_general || "em definição"}`}
            </h1>
            <p className={`app-header-copy ${soldierMode ? "soldier-copy" : ""}`}>
              {soldierMode
                ? "O General já decidiu. Cumpra."
                : "Defina ordens, acompanhe pendências e mantenha a execução sob controle."}
            </p>
          </div>
        </div>

        <div className="app-header-side">
          <span className={`mode-pill ${soldierMode ? "soldier" : "general"}`}>
            {soldierMode ? "Modo Soldado ativo" : "Modo General ativo"}
          </span>
          <p className="operator-line">
            Conta ativa: <strong>{user.usuario}</strong>
          </p>
          {soldierMode ? (
            <button
              className="button secondary subtle-button"
              type="button"
              onClick={() => {
                setSessionStatus(emptyStatus);
                setShowUnlockGeneral(true);
              }}
            >
              Liberar General
            </button>
          ) : (
            <button
              className="button primary subtle-button"
              type="button"
              onClick={() => {
                setSessionStatus(emptyStatus);
                setShowSoldierConfirm(true);
              }}
            >
              Ativar Soldado
            </button>
          )}
          {!soldierMode && (
            <button
              className="button secondary subtle-button"
              type="button"
              onClick={async () => {
                const nextValue = !showWeeklyReport;
                setShowWeeklyReport(nextValue);
                if (nextValue) {
                  await loadWeeklyReport();
                }
              }}
            >
              {showWeeklyReport ? "Voltar ao quadro" : "Ver relatório semanal"}
            </button>
          )}
          <button className="button secondary subtle-button" type="button" onClick={clearSession}>
            Encerrar sessão
          </button>
        </div>
      </header>

      <section className="workspace">
        <section className="mission-column">
          <section className="panel mission-area">
            {showWeeklyReport && !soldierMode ? (
              <WeeklyReportPanel
                report={weeklyReport}
                loading={reportLoading || reviewLoading}
                onRefresh={() => {
                  loadReviewMissions();
                  loadWeeklyReport();
                }}
              />
            ) : (
              <>
                <div className="section-heading mission-heading">
                  <div>
                    <p className="section-kicker">Quadro operacional</p>
                    <h2>Ordens em curso</h2>
                    {soldierMode && (
                      <p className="muted section-mode-copy">
                        Planejamento indisponível. Nesta tela, o Soldado só executa.
                      </p>
                    )}
                  </div>
                  <div className="inline-summary" aria-label="Resumo operacional">
                    <div className="inline-summary-item">
                      <span>Total</span>
                      <strong>{totals.all}</strong>
                    </div>
                    <div className="inline-summary-item pending">
                      <span>Pendentes</span>
                      <strong>{totals.pending}</strong>
                    </div>
                    <div className="inline-summary-item success">
                      <span>Concluídas</span>
                      <strong>{totals.completed}</strong>
                    </div>
                  </div>
                </div>

                <MissionToolbar
                  filters={filters}
                  onChange={setFilters}
                  onRefresh={() => loadMissions()}
                  loading={missionLoading}
                />

                {missionStatus.message && (
                  <p className={`feedback ${missionStatus.type}`}>{missionStatus.message}</p>
                )}
                {sessionStatus.message && (
                  <p className={`feedback ${sessionStatus.type}`}>{sessionStatus.message}</p>
                )}

                {soldierMode && pendingSoldierExcuses.length > 0 && (
                  <section className="review-panel soldier-pending-panel" aria-label="Pendências de justificativa">
                    <div className="review-panel-header">
                      <div>
                        <p className="section-kicker">Pendências de justificativa</p>
                        <h3>Missões vencidas aguardando resposta</h3>
                        <p className="muted review-copy">
                          Essas ordens saíram da execução. Registre o motivo antes de seguir.
                        </p>
                      </div>
                    </div>

                    <div className="review-list">
                      {pendingSoldierExcuses.map((mission) => (
                        <article key={`excuse-${mission.id}`} className="review-card soldier-pending-card">
                          <div className="review-card-header">
                            <div>
                              <h4>{mission.titulo}</h4>
                              <p className="muted">
                                Prazo vencido: {mission.prazo || "Sem prazo definido"} · Falhou em{" "}
                                {formatDateTime(mission.failed_at)}
                              </p>
                            </div>
                          </div>
                          <div className="review-reason">
                            <span>O que aconteceu</span>
                            <p>{mission.instrucao}</p>
                          </div>
                          <div className="soldier-excuse-form">
                            <label>
                              Justificativa
                              <textarea
                                name={`soldier-excuse-${mission.id}`}
                                rows="3"
                                value={excuseDrafts[mission.id] || ""}
                                onChange={(event) => updateExcuseDraft(mission.id, event.target.value)}
                                placeholder="Explique o motivo"
                              />
                            </label>
                            <button
                              className="button primary"
                              type="button"
                              onClick={() => submitSoldierExcuse(mission.id)}
                              disabled={excuseLoading}
                            >
                              {excuseLoading ? "Enviando..." : "Enviar justificativa"}
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                {!soldierMode && (
                  <GeneralReviewPanel
                    missions={reviewMissions}
                    loadingMissionId={verdictLoadingId}
                    onReview={submitGeneralReview}
                  />
                )}

                <MissionList
                  missions={boardMissions}
                  loading={missionLoading}
                  onEdit={setEditingMission}
                  onComplete={completeMission}
                  onDelete={deleteMission}
                  onHistory={loadHistory}
                  onToggleDecision={toggleMissionDecision}
                  togglingDecisionId={decisionLoadingId}
                  planningLocked={soldierMode}
                  canExecute={soldierMode}
                />
              </>
            )}
          </section>
        </section>

        <aside className="general-column">
          {soldierMode ? (
            <section className="panel soldier-lock-panel">
              <div className="section-heading general-heading">
                <div>
                  <p className="section-kicker">Posto do General</p>
                  <h2>Planejamento bloqueado</h2>
                  <p className="muted form-lead">
                    O General fica indisponível enquanto o modo Soldado estiver ativo.
                    Para editar, criar ou reorganizar ordens, libere o General com a senha.
                  </p>
                </div>
              </div>
            </section>
          ) : (
            <>
              <MissionForm
                editingMission={editingMission}
                currentUser={user}
                loading={formLoading}
                status={formStatus}
                onCreate={createMission}
                onUpdate={updateMission}
                onCancelEdit={() => setEditingMission(null)}
              />
            </>
          )}
        </aside>
      </section>

      {generalNameRequired && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="modal-card general-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="general-modal-title"
          >
            <button
              className="modal-close"
              type="button"
              aria-label="Fechar configuração do General"
              onClick={() => setGeneralModalDismissed(true)}
            >
              ×
            </button>
            <p className="section-kicker">Identidade do General</p>
            <h2 id="general-modal-title">Defina o nome do seu General</h2>
            <p className="muted">
              Antes de continuar, nomeie a sua camada de comando. Esse nome é obrigatório
              e fica separado da conta autenticada.
            </p>

            <form className="form-stack" onSubmit={saveGeneralName}>
              <label>
                Nome de guerra
                <input
                  name="nome_general"
                  value={generalNameDraft}
                  onChange={(event) => setGeneralNameDraft(event.target.value)}
                  placeholder="Digite o nome de guerra"
                  autoFocus
                />
              </label>

              {generalStatus.message && (
                <p className={`feedback ${generalStatus.type}`}>{generalStatus.message}</p>
              )}

              <button className="button primary" type="submit" disabled={generalNameLoading}>
                {generalNameLoading ? "Salvando..." : "Confirmar General"}
              </button>
            </form>
          </section>
        </div>
      )}

      {showSoldierConfirm && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-card general-modal" role="dialog" aria-modal="true">
            <button
              className="modal-close"
              type="button"
              aria-label="Fechar confirmação do modo Soldado"
              onClick={() => setShowSoldierConfirm(false)}
            >
              ×
            </button>
            <p className="section-kicker">Modo Soldado</p>
            <h2>Entrar em execução</h2>
            <p className="muted">
              Você está entrando em modo de execução. Planejamento, edição e exclusão de
              missões ficarão indisponíveis até a liberação do General.
            </p>
            <div className="actions-row">
              <button
                className="button secondary"
                type="button"
                onClick={() => setShowSoldierConfirm(false)}
              >
                Cancelar
              </button>
              <button
                className="button primary"
                type="button"
                onClick={activateSoldierMode}
                disabled={sessionModeLoading}
              >
                {sessionModeLoading ? "Ativando..." : "Confirmar"}
              </button>
            </div>
          </section>
        </div>
      )}

      {showUnlockGeneral && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-card general-modal" role="dialog" aria-modal="true">
            <button
              className="modal-close"
              type="button"
              aria-label="Fechar liberação do General"
              onClick={() => {
                setShowUnlockGeneral(false);
                setUnlockPassword("");
              }}
            >
              ×
            </button>
            <p className="section-kicker">Liberar General</p>
            <h2>Senha necessária para voltar ao planejamento</h2>
            <p className="muted">
              O modo Soldado permanece ativo até a senha correta ser validada.
            </p>
            <form className="form-stack" onSubmit={unlockGeneral}>
              <label>
                Senha
                <input
                  type="password"
                  name="senha"
                  value={unlockPassword}
                  onChange={(event) => setUnlockPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                />
              </label>
              <div className="actions-row">
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => {
                    setShowUnlockGeneral(false);
                    setUnlockPassword("");
                  }}
                >
                  Cancelar
                </button>
                <button className="button primary" type="submit" disabled={sessionModeLoading}>
                  {sessionModeLoading ? "Validando..." : "Liberar General"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
