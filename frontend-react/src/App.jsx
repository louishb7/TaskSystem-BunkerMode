import React, { useEffect, useMemo, useState } from "react";
import { api } from "./api/client.js";
import AuthScreen from "./components/AuthScreen.jsx";
import MissionForm from "./components/MissionForm.jsx";
import MissionList from "./components/MissionList.jsx";
import MissionToolbar from "./components/MissionToolbar.jsx";

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

function isDone(mission) {
  return String(mission.status || "").toLowerCase().includes("conclu");
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
    filtered = filtered.filter((mission) => !isDone(mission));
  }

  if (filters.status === "concluida") {
    filtered = filtered.filter(isDone);
  }

  if (filters.decided === "decididas") {
    filtered = filtered.filter((mission) => mission.is_decided);
  }

  if (filters.decided === "nao_decididas") {
    filtered = filtered.filter((mission) => !mission.is_decided);
  }

  filtered.sort((a, b) => {
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

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(readStoredUser);
  const [missions, setMissions] = useState([]);
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
  const [authStatus, setAuthStatus] = useState(emptyStatus);
  const [missionStatus, setMissionStatus] = useState(emptyStatus);
  const [formStatus, setFormStatus] = useState(emptyStatus);
  const [generalStatus, setGeneralStatus] = useState(emptyStatus);

  const authenticated = Boolean(token && user);
  const generalNameRequired =
    authenticated && profileReady && !user?.nome_general && !generalModalDismissed;

  const visibleMissions = useMemo(
    () => filterMissions(missions, filters),
    [missions, filters]
  );

  const totals = useMemo(() => {
    const completed = missions.filter(isDone).length;
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
    }
  }, [authenticated]);

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
    setEditingMission(null);
    setMissionStatus(emptyStatus);
    setFormStatus(emptyStatus);
    setGeneralStatus(emptyStatus);
    setProfileReady(true);
    setGeneralModalDismissed(false);
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

    setMissions(result.data);
    setMissionStatus({
      type: successMessage ? "success" : "muted",
      message: successMessage || `${result.data.length} missão(ões) carregada(s).`,
    });
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
            <h1>General {user.nome_general || "em definição"}</h1>
            <p className="app-header-copy">
              Defina ordens, acompanhe pendências e mantenha a execução sob controle.
            </p>
          </div>
        </div>

        <div className="app-header-side">
          <p className="operator-line">
            Conta ativa: <strong>{user.usuario}</strong>
          </p>
          <button className="button secondary subtle-button" type="button" onClick={clearSession}>
            Encerrar sessão
          </button>
        </div>
      </header>

      <section className="workspace">
        <section className="mission-column">
          <section className="panel mission-area">
            <div className="section-heading mission-heading">
              <div>
                <p className="section-kicker">Quadro operacional</p>
                <h2>Ordens em curso</h2>
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

            <MissionList
              missions={visibleMissions}
              loading={missionLoading}
              onEdit={setEditingMission}
              onComplete={completeMission}
              onDelete={deleteMission}
              onHistory={loadHistory}
              onToggleDecision={toggleMissionDecision}
              togglingDecisionId={decisionLoadingId}
            />
          </section>
        </section>

        <aside className="general-column">
          <MissionForm
            editingMission={editingMission}
            currentUser={user}
            loading={formLoading}
            status={formStatus}
            onCreate={createMission}
            onUpdate={updateMission}
            onCancelEdit={() => setEditingMission(null)}
          />
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
    </main>
  );
}
