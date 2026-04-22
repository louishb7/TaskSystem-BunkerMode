const API_URL = "http://127.0.0.1:8000/api/v2";
const TOKEN_KEY = "bunkermode_token";
const USER_KEY = "bunkermode_usuario";

const state = {
  token: null,
  usuario: null,
  missoes: []
};

const elements = {
  sessionStatus: document.getElementById("sessionStatus"),
  registroStatus: document.getElementById("registroStatus"),
  loginStatus: document.getElementById("loginStatus"),
  meOutput: document.getElementById("meOutput"),
  missaoStatus: document.getElementById("missaoStatus"),
  missoesStatus: document.getElementById("missoesStatus"),
  missoesOutput: document.getElementById("missoesOutput"),
  missionList: document.getElementById("missionList")
};

function setStatus(element, text, variant = "muted") {
  element.className = `status ${variant}`;
  element.innerText = text;
}

function setOutput(element, data) {
  element.innerText = typeof data === "string" ? data : JSON.stringify(data, null, 2);
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
}

function atualizarStatusSessao() {
  if (state.token && state.usuario) {
    setStatus(elements.sessionStatus, `Autenticado como ${state.usuario.usuario} (id=${state.usuario.id}).`, "success");
    return;
  }
  setStatus(elements.sessionStatus, "Não autenticado.", "muted");
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
    "Authorization": `Bearer ${state.token}`
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
      data: { detail: "Resposta inválida ou vazia do servidor." }
    };
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, options);
  const result = await parseResponse(response);

  if (result.status === 401) {
    limparSessao();
  }

  return result;
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
    body: JSON.stringify({ usuario, email, senha })
  });

  if (!result.ok) {
    setStatus(elements.registroStatus, `Erro no registro (${result.status}): ${result.data.detail || "erro desconhecido"}`, "error");
    return;
  }

  setStatus(elements.registroStatus, "Usuário registrado com sucesso.", "success");
  setOutput(elements.meOutput, result.data);
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
    body: JSON.stringify({ email, senha })
  });

  if (!result.ok) {
    setStatus(elements.loginStatus, `Erro no login (${result.status}): ${result.data.detail || "erro desconhecido"}`, "error");
    return;
  }

  salvarSessao(result.data.access_token, result.data.usuario);
  setStatus(elements.loginStatus, "Login realizado com sucesso.", "success");
  setOutput(elements.meOutput, result.data.usuario);
}

async function carregarUsuarioAtual() {
  if (!state.token) {
    setOutput(elements.meOutput, "Faça login primeiro.");
    return;
  }

  const result = await request("/usuarios/me", {
    headers: { Authorization: `Bearer ${state.token}` }
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
    responsavel_id: state.usuario.id
  };

  const result = await request("/missoes", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });

  if (!result.ok) {
    setStatus(elements.missaoStatus, `Erro ao criar missão (${result.status}): ${result.data.detail || "erro desconhecido"}`, "error");
    return;
  }

  setStatus(elements.missaoStatus, "Missão criada com sucesso.", "success");
  await listarMissoes();
}

function renderizarMissoes() {
  if (!state.missoes.length) {
    elements.missionList.className = "mission-list empty-state";
    elements.missionList.innerText = "Nenhuma missão carregada.";
    setStatus(elements.missoesStatus, "Nenhuma missão carregada.", "muted");
    setOutput(elements.missoesOutput, "Nenhuma missão carregada.");
    return;
  }

  elements.missionList.className = "mission-list";
  elements.missionList.innerHTML = "";
  setStatus(elements.missoesStatus, `${state.missoes.length} missão(ões) carregada(s).`, "success");
  setOutput(elements.missoesOutput, state.missoes);

  state.missoes.forEach((missao) => {
    const card = document.createElement("article");
    card.className = "mission-card";
    card.innerHTML = `
      <h3>${missao.titulo}</h3>
      <div class="mission-meta">
        <span>ID: ${missao.id}</span>
        <span>Status: ${missao.status}</span>
        <span>Prioridade: ${missao.prioridade}</span>
        <span>Prazo: ${missao.prazo ?? "sem prazo"}</span>
      </div>
      <p>${missao.instrucao}</p>
      <div class="mission-actions">
        <button type="button" data-action="concluir" data-id="${missao.id}">Concluir</button>
        <button type="button" class="ghost" data-action="historico" data-id="${missao.id}">Ver histórico</button>
        <button type="button" class="danger" data-action="remover" data-id="${missao.id}">Apagar missão</button>
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

  const result = await request("/missoes", {
    headers: { Authorization: `Bearer ${state.token}` }
  });

  if (!result.ok) {
    setOutput(elements.missoesOutput, `Erro (${result.status}): ${result.data.detail || "erro desconhecido"}`);
    return;
  }

  state.missoes = result.data;
  renderizarMissoes();
}

async function concluirMissao(missaoId) {
  const result = await request(`/missoes/${missaoId}/concluir`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${state.token}` }
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
    headers: { Authorization: `Bearer ${state.token}` }
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
    headers: { Authorization: `Bearer ${state.token}` }
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

document.getElementById("registerButton").addEventListener("click", registrar);
document.getElementById("loginButton").addEventListener("click", login);
document.getElementById("loadMeButton").addEventListener("click", carregarUsuarioAtual);
document.getElementById("createMissionButton").addEventListener("click", criarMissao);
document.getElementById("listMissionsButton").addEventListener("click", listarMissoes);
document.getElementById("clearMissionsButton").addEventListener("click", limparMissoes);
document.getElementById("restoreSessionButton").addEventListener("click", restaurarSessao);
document.getElementById("logoutButton").addEventListener("click", logout);

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

restaurarSessao();
renderizarMissoes();
