import React, { useEffect, useMemo, useState } from "react";

import { api } from "./api/client.js";
import AuthScreen from "./components/AuthScreen.jsx";
import BrandSymbol from "./components/BrandSymbol.jsx";
import GeneralReviewPanel from "./components/GeneralReviewPanel.jsx";
import MissionCard, { MissionProgress } from "./components/MissionCard.jsx";
import MissionForm from "./components/MissionForm.jsx";
import { formatDateForApi } from "./utils/date.js";
import { isCompleted, STATUS_MISSAO } from "./utils/missionStatus.js";

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

function getErrorMessage(result, fallback) {
  if (result?.status === 0) {
    return "Não foi possível conectar à API.";
  }
  return result?.data?.detail || fallback;
}

function startOfDay(value) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addDays(value, amount) {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function getWeekDays(referenceDate) {
  const base = startOfDay(referenceDate);
  const mondayOffset = base.getDay() === 0 ? -6 : 1 - base.getDay();
  const monday = addDays(base, mondayOffset);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

function formatShortDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

function normalizePrazo(value) {
  if (!value || typeof value !== "string") {
    return "";
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    return value;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split("-");
    return `${day}-${month}-${year}`;
  }

  return value;
}

function formatWeekLabel(weekDays) {
  if (!weekDays.length) {
    return "";
  }
  return `${formatShortDate(weekDays[0])} a ${formatShortDate(weekDays[6])}`;
}

function formatSelectedDate(date) {
  try {
    return date
      .toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
      })
      .toUpperCase();
  } catch {
    return formatShortDate(date);
  }
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

function canCompleteInSoldier(mission) {
  return (
    mission?.status_code === STATUS_MISSAO.PENDENTE &&
    mission?.permissions?.can_complete === true
  );
}

function canJustifyInSoldier(mission) {
  return mission?.permissions?.can_justify === true;
}

function StatusNotice({ status }) {
  if (!status?.message) {
    return null;
  }

  return <p className={`feedback ${status.type}`}>{status.message}</p>;
}

function TacticalShell({ children, mode = "general" }) {
  return <main className={`tactical-shell ${mode}`}>{children}</main>;
}

function DaySelector({
  missionCountsByDate,
  onSelectDate,
  selectedDate,
  todayDate,
  weekDays,
}) {
  const labels = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

  return (
    <div className="week-board" aria-label="Semana operacional">
      {weekDays.map((date) => {
        const apiDate = formatDateForApi(date);
        const selected = date.getTime() === selectedDate.getTime();
        const today = date.getTime() === todayDate.getTime();
        const count = missionCountsByDate[apiDate] || 0;

        return (
          <button
            key={date.toISOString()}
            className={`day-node ${selected ? "selected" : ""} ${today ? "today" : ""}`}
            type="button"
            onClick={() => onSelectDate(date)}
          >
            <span className="day-week">{labels[date.getDay()]}</span>
            <span className="day-number">{String(date.getDate()).padStart(2, "0")}</span>
            <span className="day-today">{today ? "HOJE" : "\u00A0"}</span>
            <span className="day-count">{count > 0 ? count : "-"}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(readStoredUser);
  const [missions, setMissions] = useState([]);
  const [reviewMissions, setReviewMissions] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [activeScreen, setActiveScreen] = useState("home");
  const [formOpen, setFormOpen] = useState(false);
  const [editingMission, setEditingMission] = useState(null);
  const [booting, setBooting] = useState(Boolean(token));
  const [missionLoading, setMissionLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [reviewLoadingId, setReviewLoadingId] = useState(null);
  const [decisionLoadingId, setDecisionLoadingId] = useState(null);
  const [completeLoadingId, setCompleteLoadingId] = useState(null);
  const [justificationLoadingId, setJustificationLoadingId] = useState(null);
  const [modeLoading, setModeLoading] = useState(false);
  const [showSoldierConfirm, setShowSoldierConfirm] = useState(false);
  const [returnStep, setReturnStep] = useState("closed");
  const [unlockPassword, setUnlockPassword] = useState("");
  const [authStatus, setAuthStatus] = useState(emptyStatus);
  const [status, setStatus] = useState(emptyStatus);
  const [formStatus, setFormStatus] = useState(emptyStatus);
  const [authLoading, setAuthLoading] = useState(false);

  const authenticated = Boolean(token && user);
  const activeMode = user?.active_mode || "general";
  const soldierMode = activeMode === "soldier";
  const generalName = user?.nome_general || user?.usuario || "General";
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const todayDate = useMemo(() => startOfDay(new Date()), []);
  const weekLabel = formatWeekLabel(weekDays);
  const selectedDateApi = formatDateForApi(selectedDate);
  const selectedDateLabel = formatSelectedDate(selectedDate);

  const selectedMissions = useMemo(
    () => missions.filter((mission) => normalizePrazo(mission?.prazo) === selectedDateApi),
    [missions, selectedDateApi]
  );

  const actionMissions = useMemo(
    () => missions.filter((mission) => canCompleteInSoldier(mission) || canJustifyInSoldier(mission)),
    [missions]
  );

  const missionCountsByDate = useMemo(() => {
    return missions.reduce((counts, mission) => {
      const key = normalizePrazo(mission?.prazo);
      if (!key) {
        return counts;
      }
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
  }, [missions]);

  const selectedCompletedCount = useMemo(
    () => selectedMissions.filter(isCompleted).length,
    [selectedMissions]
  );
  const selectedRemainingCount = Math.max(0, selectedMissions.length - selectedCompletedCount);

  useEffect(() => {
    if (!token) {
      setBooting(false);
      return;
    }

    restoreSession();
  }, [token]);

  useEffect(() => {
    if (!authenticated) {
      return;
    }

    if (soldierMode) {
      loadSoldierBoard();
      return;
    }

    loadGeneralBoard();
  }, [authenticated, soldierMode]);

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
    setActiveScreen("home");
    setFormOpen(false);
    setEditingMission(null);
    setStatus(emptyStatus);
    setFormStatus(emptyStatus);
    setAuthStatus(emptyStatus);
    setReturnStep("closed");
    setUnlockPassword("");
    setBooting(false);
  }

  function handleUnauthorized(result) {
    if (result?.status === 401) {
      clearSession();
      setAuthStatus({ type: "error", message: "Sessão expirada. Faça login novamente." });
      return true;
    }
    return false;
  }

  async function restoreSession() {
    setBooting(true);
    const result = await api.getCurrentUser(token);
    setBooting(false);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setStatus({ type: "error", message: getErrorMessage(result, "Não foi possível recarregar o usuário.") });
      return;
    }

    persistUser(result.data);
  }

  async function login(payload) {
    if (!payload.email || !payload.senha) {
      setAuthStatus({ type: "error", message: "Preencha usuário e senha." });
      return;
    }

    setAuthLoading(true);
    setAuthStatus(emptyStatus);
    const result = await api.login(payload);
    setAuthLoading(false);

    if (!result.ok) {
      setAuthStatus({ type: "error", message: getErrorMessage(result, "Não foi possível entrar no bunker.") });
      return;
    }

    localStorage.setItem(TOKEN_KEY, result.data.access_token);
    setToken(result.data.access_token);
    persistUser(result.data.usuario);
  }

  async function register(payload) {
    if (!payload.usuario || !payload.email || !payload.senha) {
      setAuthStatus({ type: "error", message: "Preencha usuário, e-mail e senha." });
      return;
    }

    setAuthLoading(true);
    setAuthStatus(emptyStatus);
    const result = await api.register(payload);
    setAuthLoading(false);

    if (!result.ok) {
      setAuthStatus({ type: "error", message: getErrorMessage(result, "Não foi possível criar a conta.") });
      return;
    }

    setAuthStatus({ type: "success", message: "Conta criada. Entre no bunker para continuar." });
  }

  async function loadGeneralBoard(successMessage = "") {
    if (!token) {
      return;
    }

    setMissionLoading(true);
    const [missionsResult, reviewResult] = await Promise.all([
      api.listMissions(token),
      api.listReviewMissions(token),
    ]);
    setMissionLoading(false);

    if (handleUnauthorized(missionsResult) || handleUnauthorized(reviewResult)) {
      return;
    }

    if (!missionsResult.ok) {
      setStatus({ type: "error", message: getErrorMessage(missionsResult, "Não foi possível carregar ordens.") });
      return;
    }

    setMissions(missionsResult.data);

    if (reviewResult.ok) {
      setReviewMissions(reviewResult.data);
    } else {
      setReviewMissions([]);
      setStatus({ type: "error", message: getErrorMessage(reviewResult, "Não foi possível carregar pós-ação.") });
      return;
    }

    setStatus(successMessage ? { type: "success", message: successMessage } : emptyStatus);
  }

  async function loadSoldierBoard(successMessage = "") {
    if (!token) {
      return;
    }

    setMissionLoading(true);
    const result = await api.listOperationalMissions(token);
    setMissionLoading(false);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setStatus({ type: "error", message: getErrorMessage(result, "Não foi possível carregar ordens.") });
      return;
    }

    setMissions(result.data);
    setReviewMissions([]);
    setStatus(successMessage ? { type: "success", message: successMessage } : emptyStatus);
  }

  async function reloadCurrentUser() {
    const result = await api.getCurrentUser(token);

    if (handleUnauthorized(result)) {
      return null;
    }

    if (!result.ok) {
      setStatus({ type: "error", message: getErrorMessage(result, "Não foi possível recarregar o usuário.") });
      return null;
    }

    persistUser(result.data);
    return result.data;
  }

  async function activateSoldierMode() {
    setModeLoading(true);
    setStatus(emptyStatus);
    const result = await api.setSessionMode(token, { mode: "soldier" });
    setModeLoading(false);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setStatus({ type: "error", message: getErrorMessage(result, "Não foi possível ativar o Soldado.") });
      return;
    }

    setShowSoldierConfirm(false);
    setFormOpen(false);
    setEditingMission(null);
    await reloadCurrentUser();
  }

  async function returnToGeneral(event) {
    event.preventDefault();

    if (!unlockPassword.trim()) {
      setStatus({ type: "error", message: "Informe a senha para retornar ao comando." });
      return;
    }

    setModeLoading(true);
    setStatus(emptyStatus);
    const result = await api.unlockGeneral(token, { senha: unlockPassword });
    setModeLoading(false);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setStatus({ type: "error", message: getErrorMessage(result, "General negado.") });
      return;
    }

    setUnlockPassword("");
    setReturnStep("closed");
    await reloadCurrentUser();
  }

  async function createMission(payload) {
    if (!payload.titulo || !payload.instrucao) {
      setFormStatus({ type: "error", message: "Informe título e instrução." });
      return;
    }

    setFormLoading(true);
    setFormStatus(emptyStatus);
    const result = await api.createMission(token, payload);
    setFormLoading(false);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setFormStatus({ type: "error", message: getErrorMessage(result, "Não foi possível registrar a ordem.") });
      return;
    }

    setFormOpen(false);
    setEditingMission(null);
    await loadGeneralBoard("Ordem registrada.");
  }

  async function updateMission(missionId, payload) {
    if (!payload.titulo || !payload.instrucao) {
      setFormStatus({ type: "error", message: "Informe título e instrução." });
      return;
    }

    setFormLoading(true);
    setFormStatus(emptyStatus);
    const result = await api.updateMission(token, missionId, payload);
    setFormLoading(false);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setFormStatus({ type: "error", message: getErrorMessage(result, "Não foi possível salvar a ordem.") });
      return;
    }

    setFormOpen(false);
    setEditingMission(null);
    await loadGeneralBoard("Ordem atualizada.");
  }

  async function toggleMissionDecision(mission) {
    if (!mission?.id) {
      setStatus({ type: "error", message: "Ordem inválida para alterar Decidida." });
      return;
    }

    setDecisionLoadingId(mission.id);
    setStatus(emptyStatus);
    const result = await api.toggleMissionDecision(token, mission.id);
    setDecisionLoadingId(null);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setStatus({ type: "error", message: getErrorMessage(result, "Não foi possível alterar Decidida.") });
      return;
    }

    await loadGeneralBoard();
  }

  async function deleteMission(mission) {
    const confirmed = window.confirm("Remover esta ordem do quadro?");
    if (!confirmed) {
      return;
    }

    setStatus(emptyStatus);
    const result = await api.deleteMission(token, mission.id);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setStatus({ type: "error", message: getErrorMessage(result, "Não foi possível remover a ordem.") });
      return;
    }

    if (editingMission?.id === mission.id) {
      setEditingMission(null);
      setFormOpen(false);
    }

    await loadGeneralBoard("Ordem removida.");
  }

  async function completeMission(mission) {
    setCompleteLoadingId(mission.id);
    setStatus(emptyStatus);
    const result = await api.completeMission(token, mission.id);
    setCompleteLoadingId(null);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setStatus({ type: "error", message: getErrorMessage(result, "Não foi possível concluir a ordem.") });
      await loadSoldierBoard();
      return;
    }

    await loadSoldierBoard("EXECUTADO");
  }

  async function submitFailureJustification(missionId, payload) {
    setJustificationLoadingId(missionId);
    setStatus(emptyStatus);
    const result = await api.submitFailureJustification(token, missionId, payload);
    setJustificationLoadingId(null);

    if (handleUnauthorized(result)) {
      return { error: "Sessão expirada. Faça login novamente." };
    }

    if (!result.ok) {
      const message = getErrorMessage(result, "Não foi possível registrar a justificativa.");
      setStatus({ type: "error", message });
      await loadSoldierBoard();
      return { error: message };
    }

    await loadSoldierBoard("JUSTIFICATIVA REGISTRADA");
    return { ok: true };
  }

  async function submitGeneralReview(missionId, accepted) {
    setReviewLoadingId(missionId);
    setStatus(emptyStatus);
    const result = await api.submitGeneralReview(token, missionId, { accepted });
    setReviewLoadingId(null);

    if (handleUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setStatus({ type: "error", message: getErrorMessage(result, "Não foi possível revisar a falha.") });
      return;
    }

    await loadGeneralBoard();
  }

  function openCreateForm() {
    setEditingMission(null);
    setFormStatus(emptyStatus);
    setFormOpen(true);
  }

  function openEditForm(mission) {
    setEditingMission(mission);
    setFormStatus(emptyStatus);
    setFormOpen(true);
  }

  if (booting) {
    return (
      <TacticalShell mode="general">
        <section className="boot-state">
          <BrandSymbol muted size="lg" />
          <p>SINCRONIZANDO COMANDO</p>
        </section>
      </TacticalShell>
    );
  }

  if (!authenticated) {
    return (
      <AuthScreen
        loading={authLoading}
        onLogin={login}
        onRegister={register}
        status={authStatus}
      />
    );
  }

  if (soldierMode) {
    return (
      <TacticalShell mode="soldier">
        <section className="soldier-layout">
          <header className="soldier-header">
            <div className="soldier-topline">
              <span>MODO SOLDADO</span>
              <BrandSymbol muted size="sm" />
              <span>{actionMissions.length} RESTAM</span>
            </div>
            <h1>LEÃO DO DIA</h1>
            <p>{formatCurrentDay()}</p>
            <div className="soldier-rule" />
            <strong>
              {missions.length === 1
                ? "1 ordem para matar o leão. Execute."
                : `${missions.length || actionMissions.length} ordens para matar o leão. Execute.`}
            </strong>
          </header>

          <StatusNotice status={status} />

          {missionLoading ? (
            <div className="empty-state loading-state">
              <h3>Sincronizando ordens</h3>
              <p>O Soldado aguarda o quadro operacional.</p>
            </div>
          ) : actionMissions.length > 0 ? (
            <div className="mission-list soldier-list">
              {actionMissions.map((mission) => (
                <MissionCard
                  key={mission.id}
                  completing={completeLoadingId === mission.id}
                  justifying={justificationLoadingId === mission.id}
                  mission={mission}
                  onComplete={() => completeMission(mission)}
                  onJustify={submitFailureJustification}
                  variant="soldier"
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>Sem ordens pendentes</h3>
              <p>Nenhuma missão operacional está disponível para execução agora.</p>
            </div>
          )}

          <footer className="soldier-footer">
            <button
              className="mode-switch return-command"
              type="button"
              onClick={() => setReturnStep("confirm")}
              disabled={modeLoading}
            >
              <span>RETORNAR AO COMANDO</span>
              <strong>VALIDAR</strong>
            </button>
          </footer>
        </section>

        {returnStep !== "closed" && (
          <div className="modal-backdrop" role="presentation">
            <section className="modal-card" role="dialog" aria-modal="true">
              {returnStep === "confirm" ? (
                <>
                  <p className="section-kicker danger">PROTOCOLO DE SAÍDA</p>
                  <h2>Retornar ao comando</h2>
                  <p className="muted">
                    Você está saindo do modo de execução. Confirme antes de voltar ao Posto de Comando.
                  </p>
                  <div className="actions-row">
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => {
                        setUnlockPassword("");
                        setReturnStep("closed");
                      }}
                    >
                      CANCELAR
                    </button>
                    <button
                      className="button danger"
                      type="button"
                      onClick={() => setReturnStep("password")}
                    >
                      CONTINUAR
                    </button>
                  </div>
                </>
              ) : (
                <form className="form-stack" onSubmit={returnToGeneral}>
                  <p className="section-kicker danger">SENHA DO GENERAL</p>
                  <label>
                    Senha
                    <input
                      autoComplete="current-password"
                      name="senha"
                      onChange={(event) => setUnlockPassword(event.target.value)}
                      placeholder="Senha"
                      type="password"
                      value={unlockPassword}
                    />
                  </label>
                  <div className="actions-row">
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => {
                        setUnlockPassword("");
                        setReturnStep("closed");
                      }}
                    >
                      CANCELAR
                    </button>
                    <button className="button danger" type="submit" disabled={modeLoading}>
                      {modeLoading ? "AGUARDE" : "RETORNAR"}
                    </button>
                  </div>
                </form>
              )}
            </section>
          </div>
        )}
      </TacticalShell>
    );
  }

  if (activeScreen === "reviews") {
    return (
      <TacticalShell mode="general">
        <section className="review-screen">
          <button className="button secondary back-command" type="button" onClick={() => setActiveScreen("home")}>
            VOLTAR AO COMANDO
          </button>
          <section className="panel review-screen-header">
            <p className="section-kicker danger">PÓS-AÇÃO</p>
            <h1>Falhas aguardando decisão</h1>
            <p className="muted">
              Revise os registros do Soldado e decida com base nos dados da execução.
            </p>
          </section>
          <StatusNotice status={status} />
          <GeneralReviewPanel
            loadingMissionId={reviewLoadingId}
            missions={reviewMissions}
            onReview={submitGeneralReview}
          />
        </section>
      </TacticalShell>
    );
  }

  return (
    <TacticalShell mode="general">
      <section className="general-layout">
        <aside className="command-rail panel">
          <div className="command-identity">
            <BrandSymbol muted size="sm" />
            <div>
              <p className="section-kicker">POSTO DE COMANDO</p>
              <h2>{generalName}</h2>
            </div>
          </div>
          <p className="rail-week">{weekLabel}</p>
          <div className="rail-actions">
            <button className="button secondary" type="button" onClick={() => setActiveScreen("reviews")}>
              PÓS-AÇÃO
              {reviewMissions.length > 0 && <span className="count-badge">{reviewMissions.length}</span>}
            </button>
            <button className="button secondary" type="button" onClick={clearSession}>
              SAIR
            </button>
          </div>
        </aside>

        <section className="general-board">
          <section className="panel tactical-panel elevated">
            <div className="section-heading">
              <div>
                <p className="section-kicker">SEMANA OPERACIONAL</p>
                <h1>A semana na parede</h1>
                <p className="muted">
                  Cada marca é um dia de caça. Escolha onde o General dará ordens.
                </p>
              </div>
            </div>
            <DaySelector
              missionCountsByDate={missionCountsByDate}
              onSelectDate={(date) => setSelectedDate(startOfDay(date))}
              selectedDate={selectedDate}
              todayDate={todayDate}
              weekDays={weekDays}
            />
          </section>

          <StatusNotice status={status} />

          <section className="board-grid">
            <article className="panel lion-panel">
              <div className="lion-top">
                <span className="lion-signal" />
                <div>
                  <p className="section-kicker danger">LEÃO DO DIA</p>
                  <h2>{selectedDateLabel}</h2>
                </div>
                <div className="lion-counter">
                  <strong>{selectedRemainingCount}</strong>
                  <span>RESTAM</span>
                </div>
              </div>
              <p className="muted">
                {selectedMissions.length === 1
                  ? "1 ordem para matar o leão do dia."
                  : `${selectedMissions.length} ordens para matar o leão do dia.`}
              </p>
              <MissionProgress label="CAÇADA" missions={selectedMissions} />
            </article>

            <article className="panel transition-panel">
              <p className="section-kicker">TRANSIÇÃO DE MODO</p>
              <h2>Entregar ordens ao Soldado</h2>
              <p className="muted">
                {reviewMissions.length > 0
                  ? "Há revisão pendente. Decida quando entrar no protocolo de execução."
                  : "Ative somente quando o plano estiver pronto para ser executado."}
              </p>
              <button
                className="mode-switch activate-soldier"
                type="button"
                onClick={() => setShowSoldierConfirm(true)}
                disabled={modeLoading}
              >
                <span>MODO SOLDADO</span>
                <strong>ATIVAR SOLDADO</strong>
              </button>
            </article>
          </section>

          <section className="panel orders-panel">
            <div className="section-heading compact">
              <div>
                <p className="section-kicker">ORDENS DO DIA</p>
                <h2>Plano da caça</h2>
                <p className="muted">
                  {selectedMissions.length === 1
                    ? "1 ordem definida para o dia selecionado."
                    : `${selectedMissions.length} ordens definidas para o dia selecionado.`}
                </p>
              </div>
              <button className="button secondary create-order" type="button" onClick={openCreateForm}>
                CRIAR NOVA ORDEM
              </button>
            </div>

            {missionLoading ? (
              <div className="empty-state loading-state">
                <h3>Sincronizando comando</h3>
                <p>Carregando ordens do dia selecionado.</p>
              </div>
            ) : selectedMissions.length > 0 ? (
              <div className="mission-list">
                {selectedMissions.map((mission) => (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    onDelete={() => deleteMission(mission)}
                    onEdit={() => openEditForm(mission)}
                    onToggleDecision={() => toggleMissionDecision(mission)}
                    toggling={decisionLoadingId === mission.id}
                    variant="general"
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <h3>Dia sem ordens</h3>
                <p>Nenhuma ordem foi definida para o dia selecionado.</p>
              </div>
            )}
          </section>
        </section>

        <aside className="general-side">
          {formOpen ? (
            <MissionForm
              currentUser={user}
              editingMission={editingMission}
              initialPrazo={editingMission ? undefined : selectedDateApi}
              loading={formLoading}
              onCancel={() => {
                setFormOpen(false);
                setEditingMission(null);
                setFormStatus(emptyStatus);
              }}
              onCreate={createMission}
              onUpdate={updateMission}
              status={formStatus}
            />
          ) : (
            <section className="panel command-console">
              <p className="section-kicker">COMANDO</p>
              <h2>Próxima ação</h2>
              <p className="muted">
                Escolha um dia, revise o Leão do Dia e registre apenas ordens que devem ser executadas.
              </p>
              <button className="button secondary create-order" type="button" onClick={openCreateForm}>
                CRIAR NOVA ORDEM
              </button>
            </section>
          )}
        </aside>
      </section>

      {showSoldierConfirm && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-card" role="dialog" aria-modal="true">
            <p className="section-kicker danger">MODO SOLDADO</p>
            <h2>Entrar em execução</h2>
            <p className="muted">
              O General já decidiu. Ao entrar, o Soldado executa sem editar, apagar ou renegociar ordens.
            </p>
            <div className="actions-row">
              <button className="button secondary" type="button" onClick={() => setShowSoldierConfirm(false)}>
                CANCELAR
              </button>
              <button className="button danger" type="button" onClick={activateSoldierMode} disabled={modeLoading}>
                {modeLoading ? "ATIVANDO" : "ATIVAR SOLDADO"}
              </button>
            </div>
          </section>
        </div>
      )}
    </TacticalShell>
  );
}
