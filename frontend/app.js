const DEFAULT_API_URL = "http://127.0.0.1:8000/api/v2";
const TOKEN_KEY = "bunkermode_token";
const USER_KEY = "bunkermode_usuario";
const API_URL_KEY = "bunkermode_api_url";

const state = {
  token: null,
  usuario: null,
  missoes: [],
  apiUrl: localStorage.getItem(API_URL_KEY) || DEFAULT_API_URL,
  loading: {
    api: false,
    auth: false,
    missions: false,
    createMission: false,
    activeMissionId: null,
  },
};

const elements = {
  sessionHeadline: document.getElementById("sessionHeadline"),
  sessionStatus: document.getElementById("sessionStatus"),
  apiStatus: document.getElementById("apiStatus"),
  apiUrlInput: document.getElementById("apiUrlInput"),
  registroStatus: document.getElementById("registroStatus"),
  loginStatus: document.getElementById("loginStatus"),
  meOutput: document.getElementById("meOutput"),
  missaoStatus: document.getElementById("missaoStatus"),
  missoesStatus: document.getElementById("missoesStatus"),
  missoesOutput: document.getElementById("missoesOutput"),
  missionList: document.getElementById("missionList"),
  totalMissoes: document.getElementById("totalMissoes"),
  totalPendentes: document.getElementById("totalPendentes"),
  totalConcluidas: document.getElementById("totalConcluidas"),
  searchInput: document.getElementById("searchInput"),
  statusFilter: document.getElementById("statusFilter"),
  sortFilter: document.getElementById("sortFilter"),
  prazoTipo: document.getElementById("prazoTipo"),
  prazoDataField: document.getElementById("prazoDataField"),
  saveApiUrlButton: document.getElementById("saveApiUrlButton"),
  resetApiUrlButton: document.getElementById("resetApiUrlButton"),
  healthcheckButton: document.getElementById("healthcheckButton"),
  registerButton: document.getElementById("registerButton"),
  loginButton: document.getElementById("loginButton"),
  loadMeButton: document.getElementById("loadMeButton"),
  createMissionButton: document.getElementById("createMissionButton"),
  listMissionsButton: document.getElementById("listMissionsButton"),
  clearMissionsButton: document.getElementById("clearMissionsButton"),
};

const api = createApiClient({
  getBaseUrl: () => state.apiUrl,
  getToken: () => state.token,
  onUnauthorized: handleUnauthorized,
});

function setFeedback(element, text, variant = "muted") {
  element.className = `feedback ${variant}`;
  element.innerText = text;
}

function setOutput(element, data) {
  element.innerText = typeof data === "string" ? data : JSON.stringify(data, null, 2);
}

function getInputValue(id) {
  return document.getElementById(id).value.trim();
}

function clearInput(id) {
  document.getElementById(id).value = "";
}

function setLoading(key, value) {
  state.loading[key] = value;
  updateButtons();
}

function setActiveMissionLoading(missionId) {
  state.loading.activeMissionId = missionId;
  updateMissionActionButtons();
}

function updateButtons() {
  const isAuthenticated = Boolean(state.token && state.usuario);

  elements.healthcheckButton.disabled = state.loading.api;
  elements.registerButton.disabled = state.loading.auth;
  elements.loginButton.disabled = state.loading.auth;
  elements.loadMeButton.disabled = !state.token || state.loading.auth;
  elements.createMissionButton.disabled = !isAuthenticated || state.loading.createMission;
  elements.listMissionsButton.disabled = !state.token || state.loading.missions;
  elements.clearMissionsButton.disabled = state.loading.missions;
}

function updateMissionActionButtons() {
  elements.missionList.querySelectorAll("button[data-id]").forEach((button) => {
    button.disabled = Number(button.dataset.id) === state.loading.activeMissionId;
  });
}

function errorDetail(result) {
  return result.data?.detail || "erro desconhecido";
}

function normalizeStatus(status) {
  return String(status || "").toLowerCase();
}

function isMissionDone(mission) {
  return normalizeStatus(mission.status).includes("conclu");
}

function getPriorityLabel(priority) {
  const labels = {
    1: "Alta",
    2: "Média",
    3: "Baixa",
  };
  return labels[priority] || String(priority);
}

function formatDateForApi(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function getSelectedDeadline() {
  const deadlineType = elements.prazoTipo.value;

  if (deadlineType === "data_especifica") {
    return getInputValue("prazo");
  }

  if (deadlineType === "amanha") {
    return formatDateForApi(addDays(new Date(), 1));
  }

  return formatDateForApi(new Date());
}

function updateDeadlineInputVisibility() {
  const isSpecificDate = elements.prazoTipo.value === "data_especifica";
  elements.prazoDataField.classList.toggle("hidden", !isSpecificDate);

  if (!isSpecificDate) {
    clearInput("prazo");
  }
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.innerText = text;
  }
  return element;
}

function appendChildren(parent, children) {
  children.forEach((child) => parent.appendChild(child));
}

function hydrateApiUrl() {
  elements.apiUrlInput.value = state.apiUrl;
  setFeedback(elements.apiStatus, `API configurada para ${state.apiUrl}`, "muted");
}

function saveApiUrl() {
  const value = elements.apiUrlInput.value.trim();
  if (!value) {
    setFeedback(elements.apiStatus, "Informe uma URL válida da API.", "error");
    return;
  }

  state.apiUrl = value.replace(/\/$/, "");
  localStorage.setItem(API_URL_KEY, state.apiUrl);
  setFeedback(elements.apiStatus, `API atualizada para ${state.apiUrl}`, "success");
}

function resetApiUrl() {
  state.apiUrl = DEFAULT_API_URL;
  localStorage.setItem(API_URL_KEY, state.apiUrl);
  hydrateApiUrl();
  setFeedback(elements.apiStatus, "URL da API restaurada para o padrão.", "success");
}

function saveSession(token, usuario) {
  state.token = token;
  state.usuario = usuario;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(usuario));
  renderSession();
}

function clearSession() {
  state.token = null;
  state.usuario = null;
  state.missoes = [];
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  renderSession();
  renderMissionList();
}

function handleUnauthorized() {
  clearSession();
  setFeedback(elements.loginStatus, "Sessão expirada. Faça login novamente.", "error");
}

function restoreSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  const usuarioJson = localStorage.getItem(USER_KEY);

  if (!token || !usuarioJson) {
    clearSession();
    setFeedback(elements.loginStatus, "Nenhuma sessão salva encontrada.", "muted");
    return;
  }

  try {
    state.token = token;
    state.usuario = JSON.parse(usuarioJson);
    renderSession();
    renderMissionList();
    setFeedback(elements.loginStatus, `Sessão restaurada para ${state.usuario.usuario}.`, "success");
  } catch {
    clearSession();
    setFeedback(elements.loginStatus, "Sessão salva inválida. Faça login novamente.", "error");
  }
}

function renderSession() {
  if (state.token && state.usuario) {
    elements.sessionHeadline.innerText = state.usuario.usuario;
    setFeedback(
      elements.sessionStatus,
      `Autenticado como ${state.usuario.usuario} (id=${state.usuario.id}).`,
      "success"
    );
  } else {
    elements.sessionHeadline.innerText = "Não autenticado";
    setFeedback(elements.sessionStatus, "Faça login para habilitar as ações protegidas da API.", "muted");
  }

  updateButtons();
}

function getFilteredMissions() {
  const search = elements.searchInput.value.trim().toLowerCase();
  const statusFilter = elements.statusFilter.value;
  const sortFilter = elements.sortFilter.value;

  let missions = [...state.missoes];

  if (search) {
    missions = missions.filter((mission) => {
      const haystack = `${mission.titulo} ${mission.instrucao}`.toLowerCase();
      return haystack.includes(search);
    });
  }

  if (statusFilter === "pendente") {
    missions = missions.filter((mission) => !isMissionDone(mission));
  }

  if (statusFilter === "concluida") {
    missions = missions.filter(isMissionDone);
  }

  missions.sort((a, b) => {
    if (sortFilter === "titulo") {
      return a.titulo.localeCompare(b.titulo, "pt-BR");
    }

    if (sortFilter === "prazo") {
      return String(a.prazo || "").localeCompare(String(b.prazo || ""), "pt-BR");
    }

    return Number(a.prioridade) - Number(b.prioridade);
  });

  return missions;
}

function renderMissionSummary(missions) {
  const done = missions.filter(isMissionDone).length;
  elements.totalMissoes.innerText = String(missions.length);
  elements.totalPendentes.innerText = String(missions.length - done);
  elements.totalConcluidas.innerText = String(done);
}

function renderEmptyMissionList(message, statusText = "Nenhuma missão carregada.", variant = "muted") {
  elements.missionList.className = "mission-list empty-state";
  elements.missionList.innerText = message;
  setFeedback(elements.missoesStatus, statusText, variant);
}

function renderStatusBadge(mission) {
  const badge = createElement("span", `badge ${isMissionDone(mission) ? "done" : "pending"}`);
  badge.innerText = mission.status;
  return badge;
}

function createMissionAction(label, action, missionId, className = "button secondary") {
  const button = createElement("button", className, label);
  button.type = "button";
  button.dataset.action = action;
  button.dataset.id = String(missionId);

  if (state.loading.activeMissionId === missionId) {
    button.disabled = true;
  }

  return button;
}

function renderMissionItem(mission) {
  const card = createElement("article", `mission-card ${isMissionDone(mission) ? "done" : ""}`);
  const header = createElement("div", "mission-header");
  const titleGroup = createElement("div");
  const title = createElement("h3", "mission-title", mission.titulo);
  const id = createElement("span", "mission-id", `ID ${mission.id}`);
  const meta = createElement("div", "mission-meta");
  const description = createElement("p", "mission-description", mission.instrucao);
  const actions = createElement("div", "mission-actions");
  const history = createElement("pre", "history-output");

  history.id = `history-${mission.id}`;
  history.innerText = "Histórico ainda não carregado.";

  appendChildren(titleGroup, [title, id]);
  appendChildren(header, [titleGroup, renderStatusBadge(mission)]);
  appendChildren(meta, [
    createElement("span", "pill", `Prioridade ${getPriorityLabel(mission.prioridade)}`),
    createElement("span", "pill", `Prazo ${mission.prazo || "sem prazo"}`),
  ]);

  if (!isMissionDone(mission)) {
    actions.appendChild(createMissionAction("Concluir", "concluir", mission.id, "button"));
  }
  actions.appendChild(createMissionAction("Histórico", "historico", mission.id));
  actions.appendChild(createMissionAction("Apagar", "remover", mission.id, "button danger secondary"));

  appendChildren(card, [header, meta, description, actions, history]);
  return card;
}

function renderMissionList() {
  const filteredMissions = getFilteredMissions();
  renderMissionSummary(filteredMissions);
  setOutput(elements.missoesOutput, state.missoes.length ? state.missoes : "Nenhuma missão carregada.");

  if (!state.token) {
    renderEmptyMissionList("Faça login para carregar missões.");
    return;
  }

  if (state.loading.missions) {
    renderEmptyMissionList("Carregando missões...", "Carregando missões...", "warning");
    return;
  }

  if (!state.missoes.length) {
    renderEmptyMissionList("Nenhuma missão carregada.");
    return;
  }

  if (!filteredMissions.length) {
    renderEmptyMissionList(
      "Nenhuma missão corresponde aos filtros atuais.",
      "0 missões após aplicar filtros.",
      "warning"
    );
    return;
  }

  elements.missionList.className = "mission-list";
  elements.missionList.innerHTML = "";
  filteredMissions.forEach((mission) => {
    elements.missionList.appendChild(renderMissionItem(mission));
  });
  setFeedback(elements.missoesStatus, `${filteredMissions.length} missão(ões) exibida(s).`, "success");
}

function getMissionPayload() {
  return {
    titulo: getInputValue("titulo"),
    instrucao: getInputValue("instrucao"),
    prazo: getSelectedDeadline(),
    prioridade: Number(document.getElementById("prioridade").value),
    responsavel_id: state.usuario.id,
  };
}

function validateMissionPayload(payload) {
  if (!payload.titulo || !payload.instrucao) {
    return "Preencha título e instrução.";
  }

  if (elements.prazoTipo.value === "data_especifica") {
    if (!payload.prazo) {
      return "Informe a data específica no formato DD-MM-YYYY.";
    }

    if (!/^\d{2}-\d{2}-\d{4}$/.test(payload.prazo)) {
      return "Use o formato DD-MM-YYYY para a data específica.";
    }
  }

  if (![1, 2, 3].includes(payload.prioridade)) {
    return "Escolha uma prioridade válida.";
  }

  return null;
}

function clearMissionForm() {
  clearInput("titulo");
  clearInput("instrucao");
  clearInput("prazo");
  elements.prazoTipo.value = "hoje";
  updateDeadlineInputVisibility();
  document.getElementById("prioridade").value = "1";
  setFeedback(elements.missaoStatus, "Formulário limpo.", "muted");
}

async function testHealthcheck() {
  setLoading("api", true);
  setFeedback(elements.apiStatus, "Testando healthcheck...", "warning");

  const result = await api.healthcheck();
  setLoading("api", false);

  if (!result.ok) {
    setFeedback(elements.apiStatus, `Healthcheck falhou (${result.status}): ${errorDetail(result)}`, "error");
    return;
  }

  setFeedback(elements.apiStatus, `Healthcheck OK em ${state.apiUrl}`, "success");
}

async function registerUser() {
  const payload = {
    usuario: getInputValue("registroUsuario"),
    email: getInputValue("registroEmail"),
    senha: document.getElementById("registroSenha").value,
  };

  if (!payload.usuario || !payload.email || !payload.senha) {
    setFeedback(elements.registroStatus, "Preencha usuário, email e senha.", "error");
    return;
  }

  setLoading("auth", true);
  setFeedback(elements.registroStatus, "Registrando usuário...", "warning");
  const result = await api.register(payload);
  setLoading("auth", false);

  if (!result.ok) {
    setFeedback(elements.registroStatus, `Erro no registro (${result.status}): ${errorDetail(result)}`, "error");
    return;
  }

  setFeedback(elements.registroStatus, "Usuário registrado com sucesso.", "success");
  setOutput(elements.meOutput, result.data);
  clearInput("registroUsuario");
  clearInput("registroEmail");
  clearInput("registroSenha");
}

async function login() {
  const payload = {
    email: getInputValue("loginEmail"),
    senha: document.getElementById("loginSenha").value,
  };

  if (!payload.email || !payload.senha) {
    setFeedback(elements.loginStatus, "Preencha email e senha.", "error");
    return;
  }

  setLoading("auth", true);
  setFeedback(elements.loginStatus, "Autenticando...", "warning");
  const result = await api.login(payload);
  setLoading("auth", false);

  if (!result.ok) {
    setFeedback(elements.loginStatus, `Erro no login (${result.status}): ${errorDetail(result)}`, "error");
    return;
  }

  saveSession(result.data.access_token, result.data.usuario);
  setFeedback(elements.loginStatus, "Login realizado com sucesso.", "success");
  setOutput(elements.meOutput, result.data.usuario);
  clearInput("loginSenha");
  await loadMissions();
}

async function loadCurrentUser() {
  if (!state.token) {
    setOutput(elements.meOutput, "Faça login primeiro.");
    return;
  }

  setLoading("auth", true);
  setOutput(elements.meOutput, "Carregando usuário...");
  const result = await api.getCurrentUser();
  setLoading("auth", false);

  if (!result.ok) {
    setOutput(elements.meOutput, `Erro (${result.status}): ${errorDetail(result)}`);
    return;
  }

  state.usuario = result.data;
  localStorage.setItem(USER_KEY, JSON.stringify(result.data));
  renderSession();
  setOutput(elements.meOutput, result.data);
}

async function createMission() {
  if (!state.token || !state.usuario) {
    setFeedback(elements.missaoStatus, "Faça login primeiro.", "error");
    return;
  }

  const payload = getMissionPayload();
  const validationError = validateMissionPayload(payload);
  if (validationError) {
    setFeedback(elements.missaoStatus, validationError, "error");
    return;
  }

  setLoading("createMission", true);
  setFeedback(elements.missaoStatus, "Criando missão...", "warning");
  const result = await api.createMission(payload);
  setLoading("createMission", false);

  if (!result.ok) {
    setFeedback(elements.missaoStatus, `Erro ao criar missão (${result.status}): ${errorDetail(result)}`, "error");
    return;
  }

  setFeedback(elements.missaoStatus, "Missão criada com sucesso.", "success");
  clearMissionForm();
  await loadMissions("Missão criada e lista atualizada.");
}

async function loadMissions(successMessage = null) {
  if (!state.token) {
    renderMissionList();
    return;
  }

  setLoading("missions", true);
  renderMissionList();
  const result = await api.listMissions();
  setLoading("missions", false);

  if (!result.ok) {
    setOutput(elements.missoesOutput, `Erro (${result.status}): ${errorDetail(result)}`);
    setFeedback(elements.missoesStatus, `Erro ao listar missões (${result.status}): ${errorDetail(result)}`, "error");
    return;
  }

  state.missoes = result.data;
  renderMissionList();

  if (successMessage) {
    setFeedback(elements.missoesStatus, successMessage, "success");
  }
}

async function completeMission(missionId) {
  setActiveMissionLoading(missionId);
  setFeedback(elements.missoesStatus, `Concluindo missão ${missionId}...`, "warning");
  const result = await api.completeMission(missionId);
  setActiveMissionLoading(null);

  if (!result.ok) {
    setFeedback(elements.missoesStatus, `Erro ao concluir missão (${result.status}): ${errorDetail(result)}`, "error");
    return;
  }

  await loadMissions(`Missão ${missionId} concluída.`);
}

async function loadMissionHistory(missionId) {
  const output = document.getElementById(`history-${missionId}`);
  if (!output) {
    return;
  }

  output.classList.add("visible");
  output.innerText = "Carregando histórico...";
  setActiveMissionLoading(missionId);
  const result = await api.getMissionHistory(missionId);
  setActiveMissionLoading(null);

  if (!result.ok) {
    output.innerText = `Erro (${result.status}): ${errorDetail(result)}`;
    return;
  }

  output.innerText = JSON.stringify(result.data, null, 2);
}

async function removeMission(missionId) {
  const confirmed = window.confirm(`Deseja realmente apagar a missão ${missionId}?`);
  if (!confirmed) {
    return;
  }

  setActiveMissionLoading(missionId);
  setFeedback(elements.missoesStatus, `Apagando missão ${missionId}...`, "warning");
  const result = await api.removeMission(missionId);
  setActiveMissionLoading(null);

  if (!result.ok) {
    setFeedback(elements.missoesStatus, `Erro ao apagar missão (${result.status}): ${errorDetail(result)}`, "error");
    return;
  }

  await loadMissions(`Missão ${missionId} apagada.`);
}

function clearMissions() {
  state.missoes = [];
  renderMissionList();
}

function logout() {
  clearSession();
  setFeedback(elements.loginStatus, "Logout realizado.", "success");
  setOutput(elements.meOutput, "Nenhum dado carregado.");
  setFeedback(elements.missaoStatus, "", "muted");
}

function handleMissionAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const missionId = Number(button.dataset.id);
  const action = button.dataset.action;

  if (action === "concluir") {
    completeMission(missionId);
  }

  if (action === "historico") {
    loadMissionHistory(missionId);
  }

  if (action === "remover") {
    removeMission(missionId);
  }
}

function bindEvents() {
  document.getElementById("apiForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveApiUrl();
  });
  document.getElementById("registerForm").addEventListener("submit", (event) => {
    event.preventDefault();
    registerUser();
  });
  document.getElementById("loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    login();
  });
  document.getElementById("missionForm").addEventListener("submit", (event) => {
    event.preventDefault();
    createMission();
  });

  elements.resetApiUrlButton.addEventListener("click", resetApiUrl);
  elements.healthcheckButton.addEventListener("click", testHealthcheck);
  elements.loadMeButton.addEventListener("click", loadCurrentUser);
  document.getElementById("clearMissionFormButton").addEventListener("click", clearMissionForm);
  elements.listMissionsButton.addEventListener("click", () => loadMissions());
  elements.clearMissionsButton.addEventListener("click", clearMissions);
  document.getElementById("restoreSessionButton").addEventListener("click", restoreSession);
  document.getElementById("logoutButton").addEventListener("click", logout);

  elements.searchInput.addEventListener("input", renderMissionList);
  elements.statusFilter.addEventListener("change", renderMissionList);
  elements.sortFilter.addEventListener("change", renderMissionList);
  elements.prazoTipo.addEventListener("change", updateDeadlineInputVisibility);
  elements.missionList.addEventListener("click", handleMissionAction);
}

function init() {
  bindEvents();
  hydrateApiUrl();
  updateDeadlineInputVisibility();
  restoreSession();
  renderSession();
  renderMissionList();
}

init();
