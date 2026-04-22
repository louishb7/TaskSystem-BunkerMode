const DEFAULT_API_URL = "http://127.0.0.1:8000/api/v2";
const TOKEN_KEY = "bunkermode_token";
const USER_KEY = "bunkermode_usuario";
const API_URL_KEY = "bunkermode_api_url";

const state = {
  token: null,
  usuario: null,
  missoes: [],
  apiUrl: localStorage.getItem(API_URL_KEY) || DEFAULT_API_URL,
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
};

function setStatus(element, text, variant = "muted") {
  element.className = `status ${variant}`;
  element.innerText = text;
}

function setOutput(element, data) {
  element.innerText = typeof data === "string" ? data : JSON.stringify(data, null, 2);
}

function clearElementValue(id) {
  document.getElementById(id).value = "";
}

function getCurrentApiUrl() {
  return state.apiUrl;
}

function hydrateApiUrl() {
  elements.apiUrlInput.value = state.apiUrl;
  setStatus(elements.apiStatus, `API configurada para ${state.apiUrl}`, "muted");
}

function saveApiUrl() {
  const value = elements.apiUrlInput.value.trim();
  if (!value) {
    setStatus(elements.apiStatus, "Informe uma URL válida da API.", "error");
    return;
  }
  state.apiUrl = value.replace(/\/$/, "");
  localStorage.setItem(API_URL_KEY, state.apiUrl);
  setStatus(elements.apiStatus, `API atualizada para ${state.apiUrl}`, "success");
}

function resetApiUrl() {
  state.apiUrl = DEFAULT_API_URL;
  localStorage.setItem(API_URL_KEY, state.apiUrl);
  hydrateApiUrl();
  setStatus(elements.apiStatus, "URL da API restaurada para o padrão.", "success");
}

function salvarSessao(token, usuario) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(usuario));
  state.token = token;
  state.usuario = usuario;
  atualizarStatusSessao();
}

function limparSessao() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  state.token = null;
  state.usuario = null;
  state.missoes = [];
  atualizarStatusSessao();
  atualizarResumoMissoes([]);
}

function atualizarStatusSessao() {
  if (state.token && state.usuario) {
    elements.sessionHeadline.innerText = state.usuario.usuario;
    setStatus(
      elements.sessionStatus,
      `Autenticado como ${state.usuario.usuario} (id=${state.usuario.id}).`,
      "success"
    );
    return;
  }
  elements.sessionHeadline.innerText = "Não autenticado";
  setStatus(elements.sessionStatus, "Faça login para habilitar as ações protegidas da API.", "muted");
}

function restaurarSessao() {
  const token = localStorage.getItem(TOKEN_KEY);
  const usuarioJson = localStorage.getItem(USER_KEY);

  if (!token || !usuarioJson) {
    limparSessao();
    setStatus(elements.loginStatus, "Nenhuma sessão salva encontrada.", "muted");
    return;
  }

  try {
    const usuario = JSON.parse(usuarioJson);
    state.token = token;
    state.usuario = usuario;
    atualizarStatusSessao();
    setStatus(elements.loginStatus, `Sessão restaurada para ${usuario.usuario}.`, "success");
  } catch {
    limparSessao();
    setStatus(elements.loginStatus, "Sessão salva inválida. Faça login novamente.", "error");
  }
}

function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${state.token}`,
  };
}

async function parseResponse(response) {
  if (response.status === 204) {
    return { ok: true, status: 204, data: null };
  }

  try {
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch {
    return {
      ok: response.ok,
      status: response.status,
      data: { detail: "Resposta inválida ou vazia do servidor." },
    };
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${getCurrentApiUrl()}${path}`, options);
  const result = await parseResponse(response);

  if (result.status === 401) {
    limparSessao();
    renderizarMissoes();
  }

  return result;
}

async function testarHealthcheck() {
  setStatus(elements.apiStatus, "Testando healthcheck...", "warning");
  const result = await request("/health");

  if (!result.ok) {
    setStatus(
      elements.apiStatus,
      `Healthcheck falhou (${result.status}): ${result.data.detail || "erro desconhecido"}`,
      "error"
    );
    return;
  }

  setStatus(elements.apiStatus, `Healthcheck OK em ${getCurrentApiUrl()}`, "success");
}

async function registrar() {
  const usuario = document.getElementById("registroUsuario").value.trim();
  const email = document.getElementById("registroEmail").value.trim();
  const senha = document.getElementById("registroSenha").value;

  if (!usuario || !email || !senha) {
    setStatus(elements.registroStatus, "Preencha usuário, email e senha.", "error");
    return;
  }

  const result = await request("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, email, senha }),
  });

  if (!result.ok) {
    setStatus(
      elements.registroStatus,
      `Erro no registro (${result.status}): ${result.data.detail || "erro desconhecido"}`,
      "error"
    );
    return;
  }

  setStatus(elements.registroStatus, "Usuário registrado com sucesso.", "success");
  setOutput(elements.meOutput, result.data);
  clearElementValue("registroUsuario");
  clearElementValue("registroEmail");
  clearElementValue("registroSenha");
}

async function login() {
  const email = document.getElementById("loginEmail").value.trim();
  const senha = document.getElementById("loginSenha").value;

  if (!email || !senha) {
    setStatus(elements.loginStatus, "Preencha email e senha.", "error");
    return;
  }

  const result = await request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha }),
  });

  if (!result.ok) {
    setStatus(elements.loginStatus, `Erro no login (${result.status}): ${result.data.detail || "erro desconhecido"}`, "error");
    return;
  }

  salvarSessao(result.data.access_token, result.data.usuario);
  setStatus(elements.loginStatus, "Login realizado com sucesso.", "success");
  setOutput(elements.meOutput, result.data.usuario);
  clearElementValue("loginSenha");
}

async function carregarUsuarioAtual() {
  if (!state.token) {
    setOutput(elements.meOutput, "Faça login primeiro.");
    return;
  }

  const result = await request("/usuarios/me", {
    headers: { Authorization: `Bearer ${state.token}` },
  });

  if (!result.ok) {
    setOutput(elements.meOutput, `Erro (${result.status}): ${result.data.detail || "erro desconhecido"}`);
    return;
  }

  state.usuario = result.data;
  localStorage.setItem(USER_KEY, JSON.stringify(result.data));
  atualizarStatusSessao();
  setOutput(elements.meOutput, result.data);
}

function clearMissionForm() {
  clearElementValue("titulo");
  clearElementValue("instrucao");
  clearElementValue("prazo");
  document.getElementById("prioridade").value = "1";
  setStatus(elements.missaoStatus, "Formulário limpo.", "muted");
}

async function criarMissao() {
  if (!state.token || !state.usuario) {
    setStatus(elements.missaoStatus, "Faça login primeiro.", "error");
    return;
  }

  const titulo = document.getElementById("titulo").value.trim();
  const instrucao = document.getElementById("instrucao").value.trim();
  const prazo = document.getElementById("prazo").value.trim();
  const prioridade = Number(document.getElementById("prioridade").value);

  if (!titulo || !instrucao || !prazo) {
    setStatus(elements.missaoStatus, "Preencha título, instrução e prazo.", "error");
    return;
  }

  const payload = {
    titulo,
    instrucao,
    prazo,
    prioridade,
    responsavel_id: state.usuario.id,
  };

  const result = await request("/missoes", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!result.ok) {
    setStatus(
      elements.missaoStatus,
      `Erro ao criar missão (${result.status}): ${result.data.detail || "erro desconhecido"}`,
      "error"
    );
    return;
  }

  setStatus(elements.missaoStatus, "Missão criada com sucesso.", "success");
  clearMissionForm();
  await listarMissoes();
}

function normalizarStatus(status) {
  return String(status || "").toLowerCase();
}

function filtrarMissoes() {
  const search = elements.searchInput.value.trim().toLowerCase();
  const statusFilter = elements.statusFilter.value;
  const sortFilter = elements.sortFilter.value;

  let missoes = [...state.missoes];

  if (search) {
    missoes = missoes.filter((missao) => {
      const haystack = `${missao.titulo} ${missao.instrucao}`.toLowerCase();
      return haystack.includes(search);
    });
  }

  if (statusFilter === "pendente") {
    missoes = missoes.filter((missao) => !normalizarStatus(missao.status).includes("conclu"));
  }

  if (statusFilter === "concluida") {
    missoes = missoes.filter((missao) => normalizarStatus(missao.status).includes("conclu"));
  }

  missoes.sort((a, b) => {
    if (sortFilter === "titulo") {
      return a.titulo.localeCompare(b.titulo, "pt-BR");
    }

    if (sortFilter === "prazo") {
      return String(a.prazo || "").localeCompare(String(b.prazo || ""), "pt-BR");
    }

    return Number(a.prioridade) - Number(b.prioridade);
  });

  return missoes;
}

function atualizarResumoMissoes(missoes) {
  const concluidas = missoes.filter((missao) => normalizarStatus(missao.status).includes("conclu")).length;
  const pendentes = missoes.length - concluidas;
  elements.totalMissoes.innerText = String(missoes.length);
  elements.totalPendentes.innerText = String(pendentes);
  elements.totalConcluidas.innerText = String(concluidas);
}

function criarBadgeStatus(status) {
  const normalized = normalizarStatus(status);
  const badgeClass = normalized.includes("conclu") ? "done" : "pending";
  return `<span class="badge ${badgeClass}">${status}</span>`;
}

function renderizarMissoes() {
  const missoesFiltradas = filtrarMissoes();
  atualizarResumoMissoes(missoesFiltradas);

  if (!state.token) {
    elements.missionList.className = "mission-list empty-state";
    elements.missionList.innerText = "Faça login para carregar missões.";
    setStatus(elements.missoesStatus, "Nenhuma missão carregada.", "muted");
    setOutput(elements.missoesOutput, "Nenhuma missão carregada.");
    return;
  }

  if (!state.missoes.length) {
    elements.missionList.className = "mission-list empty-state";
    elements.missionList.innerText = "Nenhuma missão carregada.";
    setStatus(elements.missoesStatus, "Nenhuma missão carregada.", "muted");
    setOutput(elements.missoesOutput, "Nenhuma missão carregada.");
    return;
  }

  if (!missoesFiltradas.length) {
    elements.missionList.className = "mission-list empty-state";
    elements.missionList.innerText = "Nenhuma missão corresponde aos filtros atuais.";
    setStatus(elements.missoesStatus, "0 missões após aplicar filtros.", "warning");
    setOutput(elements.missoesOutput, state.missoes);
    return;
  }

  elements.missionList.className = "mission-list";
  elements.missionList.innerHTML = "";
  setStatus(elements.missoesStatus, `${missoesFiltradas.length} missão(ões) exibida(s).`, "success");
  setOutput(elements.missoesOutput, state.missoes);

  missoesFiltradas.forEach((missao) => {
    const card = document.createElement("article");
    card.className = "mission-card";
    card.innerHTML = `
      <div class="mission-header">
        <div>
          <h3>${missao.titulo}</h3>
          <p class="subtitle">ID ${missao.id}</p>
        </div>
        ${criarBadgeStatus(missao.status)}
      </div>
      <div class="mission-meta">
        <span>Prioridade: ${missao.prioridade}</span>
        <span>Prazo: ${missao.prazo ?? "sem prazo"}</span>
      </div>
      <p class="mission-description">${missao.instrucao}</p>
      <div class="mission-actions">
        <button type="button" data-action="concluir" data-id="${missao.id}">Concluir</button>
        <button type="button" class="ghost" data-action="historico" data-id="${missao.id}">Histórico</button>
        <button type="button" class="danger" data-action="remover" data-id="${missao.id}">Apagar</button>
      </div>
      <pre class="history-output" id="history-${missao.id}">Histórico ainda não carregado.</pre>
    `;
    elements.missionList.appendChild(card);
  });
}

async function listarMissoes() {
  if (!state.token) {
    renderizarMissoes();
    return;
  }

  setStatus(elements.missoesStatus, "Carregando missões...", "warning");
  const result = await request("/missoes", {
    headers: { Authorization: `Bearer ${state.token}` },
  });

  if (!result.ok) {
    setOutput(elements.missoesOutput, `Erro (${result.status}): ${result.data.detail || "erro desconhecido"}`);
    setStatus(elements.missoesStatus, `Erro ao listar missões (${result.status}).`, "error");
    return;
  }

  state.missoes = result.data;
  renderizarMissoes();
}

async function concluirMissao(missaoId) {
  const result = await request(`/missoes/${missaoId}/concluir`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${state.token}` },
  });

  if (!result.ok) {
    setStatus(elements.missoesStatus, `Erro ao concluir missão (${result.status}): ${result.data.detail || "erro desconhecido"}`, "error");
    return;
  }

  setStatus(elements.missoesStatus, `Missão ${missaoId} concluída.`, "success");
  await listarMissoes();
}

async function carregarHistorico(missaoId) {
  const output = document.getElementById(`history-${missaoId}`);
  output.innerText = "Carregando histórico...";

  const result = await request(`/missoes/${missaoId}/historico`, {
    headers: { Authorization: `Bearer ${state.token}` },
  });

  if (!result.ok) {
    output.innerText = `Erro (${result.status}): ${result.data.detail || "erro desconhecido"}`;
    return;
  }

  output.innerText = JSON.stringify(result.data, null, 2);
}

async function removerMissao(missaoId) {
  const confirmou = window.confirm(`Deseja realmente apagar a missão ${missaoId}?`);
  if (!confirmou) {
    return;
  }

  const result = await request(`/missoes/${missaoId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${state.token}` },
  });

  if (!result.ok) {
    setStatus(elements.missoesStatus, `Erro ao apagar missão (${result.status}): ${result.data.detail || "erro desconhecido"}`, "error");
    return;
  }

  setStatus(elements.missoesStatus, `Missão ${missaoId} apagada.`, "success");
  await listarMissoes();
}

function limparMissoes() {
  state.missoes = [];
  renderizarMissoes();
}

function logout() {
  limparSessao();
  setStatus(elements.loginStatus, "Logout realizado.", "success");
  setOutput(elements.meOutput, "Nenhum dado carregado.");
  limparMissoes();
  setStatus(elements.missaoStatus, "", "muted");
}

document.getElementById("saveApiUrlButton").addEventListener("click", saveApiUrl);
document.getElementById("resetApiUrlButton").addEventListener("click", resetApiUrl);
document.getElementById("healthcheckButton").addEventListener("click", testarHealthcheck);
document.getElementById("registerButton").addEventListener("click", registrar);
document.getElementById("loginButton").addEventListener("click", login);
document.getElementById("loadMeButton").addEventListener("click", carregarUsuarioAtual);
document.getElementById("createMissionButton").addEventListener("click", criarMissao);
document.getElementById("clearMissionFormButton").addEventListener("click", clearMissionForm);
document.getElementById("listMissionsButton").addEventListener("click", listarMissoes);
document.getElementById("clearMissionsButton").addEventListener("click", limparMissoes);
document.getElementById("restoreSessionButton").addEventListener("click", restaurarSessao);
document.getElementById("logoutButton").addEventListener("click", logout);
elements.searchInput.addEventListener("input", renderizarMissoes);
elements.statusFilter.addEventListener("change", renderizarMissoes);
elements.sortFilter.addEventListener("change", renderizarMissoes);

elements.missionList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const missaoId = Number(button.dataset.id);
  const action = button.dataset.action;

  if (action === "concluir") {
    await concluirMissao(missaoId);
    return;
  }

  if (action === "historico") {
    await carregarHistorico(missaoId);
    return;
  }

  if (action === "remover") {
    await removerMissao(missaoId);
  }
});

hydrateApiUrl();
restaurarSessao();
renderizarMissoes();
