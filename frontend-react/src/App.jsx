import { useEffect, useMemo, useState } from "react";
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
    sort: "prioridade",
  });
  const [authModeLoading, setAuthModeLoading] = useState(false);
  const [missionLoading, setMissionLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState(emptyStatus);
  const [missionStatus, setMissionStatus] = useState(emptyStatus);
  const [formStatus, setFormStatus] = useState(emptyStatus);

  const authenticated = Boolean(token && user);

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
      loadMissions();
    }
  }, [authenticated]);

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setMissions([]);
    setEditingMission(null);
    setMissionStatus(emptyStatus);
    setFormStatus(emptyStatus);
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
    localStorage.setItem(USER_KEY, JSON.stringify(result.data.usuario));
    setToken(result.data.access_token);
    setUser(result.data.usuario);
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
    const result = await api.getMissionHistory(token, missionId);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setMissionStatus({ type: "error", message: `Erro ao carregar histórico: ${result.data.detail}` });
      return;
    }

    setMissions((current) =>
      current.map((mission) =>
        mission.id === missionId ? { ...mission, history: result.data } : mission
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
        <div>
          <p className="eyebrow">BunkerMode</p>
          <h1>Missões</h1>
          <p className="muted">Autenticado como {user.usuario}.</p>
        </div>
        <button className="button secondary" type="button" onClick={clearSession}>
          Sair
        </button>
      </header>

      <section className="summary-grid" aria-label="Resumo de missões">
        <article>
          <span>Total</span>
          <strong>{totals.all}</strong>
        </article>
        <article>
          <span>Pendentes</span>
          <strong>{totals.pending}</strong>
        </article>
        <article>
          <span>Concluídas</span>
          <strong>{totals.completed}</strong>
        </article>
      </section>

      <section className="workspace">
        <section className="panel mission-area">
          <div className="section-heading">
            <div>
              <h2>Plano de execução</h2>
              <p className="muted">Filtre, conclua, edite ou remova missões.</p>
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
          />
        </section>

        <MissionForm
          editingMission={editingMission}
          currentUser={user}
          loading={formLoading}
          status={formStatus}
          onCreate={createMission}
          onUpdate={updateMission}
          onCancelEdit={() => setEditingMission(null)}
        />
      </section>
    </main>
  );
}
