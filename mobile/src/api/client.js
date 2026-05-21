import {
  assertMissionContract,
  assertMissionListContract,
} from "./missionContract";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://192.168.18.71:8000/api/v2";

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

async function request(path, { token, method = "GET", body } = {}) {
  const headers = {};

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return parseResponse(response);
  } catch {
    return {
      ok: false,
      status: 0,
      data: { detail: "Não foi possível conectar à API." },
    };
  }
}

async function requestMission(path, options = {}) {
  const result = await request(path, options);
  if (!result.ok) {
    return result;
  }

  try {
    return { ...result, data: assertMissionContract(result.data) };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: { detail: error.message },
    };
  }
}

async function requestMissionList(path, options = {}) {
  const result = await request(path, options);
  if (!result.ok) {
    return result;
  }

  try {
    return { ...result, data: assertMissionListContract(result.data) };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: { detail: error.message },
    };
  }
}

export const api = {
  login(payload) {
    return request("/auth/login", { method: "POST", body: payload });
  },
  getCurrentUser(token) {
    return request("/usuarios/me", { token });
  },
  activateSoldierMode(token) {
    return request("/session/mode", {
      token,
      method: "PATCH",
      body: { mode: "soldier" },
    });
  },
  listOperationalMissions(token) {
    return requestMissionList("/missoes/operacionais", { token });
  },
  listDailyMissions(token) {
    return requestMissionList("/missoes/dia-operacional", { token });
  },
  completeMission(token, missionId) {
    return requestMission(`/missoes/${missionId}/concluir`, {
      token,
      method: "PATCH",
    });
  },
  failMission(token, missionId) {
    return requestMission(`/missoes/${missionId}/falhar`, {
      token,
      method: "POST",
    });
  },
  submitFailureJustification(token, missionId, payload) {
    return this.failMission(token, missionId);
  },
  register(payload) {
    return request("/auth/register", { method: "POST", body: payload });
  },
  saveGeneralName(token, payload) {
    return request("/usuarios/me/nome-general", {
      token,
      method: "PATCH",
      body: payload,
    });
  },
  setSessionMode(token, payload) {
    return request("/session/mode", {
      token,
      method: "PATCH",
      body: payload,
    });
  },
  listMissions(token) {
    return requestMissionList("/missoes", { token });
  },
  listReviewMissions(token) {
    return requestMissionList("/missoes/revisao", { token });
  },
  listHistoricalMissions(token) {
    return requestMissionList("/missoes/historico", { token });
  },
  createMission(token, payload) {
    return requestMission("/missoes", { token, method: "POST", body: payload });
  },
  updateMission(token, missionId, payload) {
    return requestMission(`/missoes/${missionId}`, {
      token,
      method: "PATCH",
      body: payload,
    });
  },
  toggleMissionPin(token, missionId) {
    return requestMission(`/missoes/${missionId}/toggle-pin`, {
      token,
      method: "PATCH",
    });
  },
  submitGeneralReview(token, missionId, payload) {
    return requestMission(`/missoes/${missionId}/revisar`, {
      token,
      method: "POST",
      body: payload,
    });
  },
  getReviewState(token) {
    return request("/revisoes/estado", { token });
  },
  listWeeklyReviews(token) {
    return request("/revisoes", { token });
  },
  closeWeeklyReview(token, payload) {
    return request("/revisoes/fechar", { token, method: "POST", body: payload });
  },
  listOperations(token) {
    return request("/operacoes", { token });
  },
  createOperation(token, payload) {
    return request("/operacoes", { token, method: "POST", body: payload });
  },
  closeOperation(token, operationId) {
    return request(`/operacoes/${operationId}/encerrar`, { token, method: "PATCH" });
  },
  materializeOperations(token, payload) {
    return request("/operacoes/materializar", { token, method: "POST", body: payload });
  },
  listDayOffs(token, payload) {
    const search = new URLSearchParams();
    search.set("start_date", payload.start_date);
    search.set("end_date", payload.end_date);
    return request(`/dias-off?${search.toString()}`, { token });
  },
  markDayOff(token, payload) {
    return request("/dias-off", { token, method: "POST", body: payload });
  },
  clearDayOff(token, date) {
    return request(`/dias-off/${encodeURIComponent(date)}`, { token, method: "DELETE" });
  },
  deleteMission(token, missionId) {
    return request(`/missoes/${missionId}`, { token, method: "DELETE" });
  },
  getMissionHistory(token, missionId) {
    return request(`/missoes/${missionId}/historico`, { token });
  },
  getWeeklyReport(token, params = {}) {
    const search = new URLSearchParams();
    if (params.start_date) {
      search.set("start_date", params.start_date);
    }
    if (params.end_date) {
      search.set("end_date", params.end_date);
    }
    const suffix = search.toString() ? `?${search.toString()}` : "";
    return request(`/relatorios/semanal${suffix}`, { token });
  },
  listSonhos(token) {
    return request("/sonhos", { token });
  },
  createSonho(token, payload) {
    return request("/sonhos", { token, method: "POST", body: payload });
  },
  updateSonho(token, sonhoId, payload) {
    return request(`/sonhos/${sonhoId}`, { token, method: "PATCH", body: payload });
  },
  promoteSonho(token, sonhoId) {
    return request(`/sonhos/${sonhoId}/promover`, { token, method: "POST" });
  },
  archiveSonho(token, sonhoId, payload) {
    return request(`/sonhos/${sonhoId}/arquivar`, { token, method: "POST", body: payload });
  },
  listObjetivos(token) {
    return request("/objetivos", { token });
  },
  createObjetivo(token, payload) {
    return request("/objetivos", { token, method: "POST", body: payload });
  },
  updateObjetivo(token, objetivoId, payload) {
    return request(`/objetivos/${objetivoId}`, { token, method: "PATCH", body: payload });
  },
  updateObjetivoProgresso(token, objetivoId, payload) {
    return request(`/objetivos/${objetivoId}/progresso`, { token, method: "PATCH", body: payload });
  },
  updateObjetivoStatus(token, objetivoId, payload) {
    return request(`/objetivos/${objetivoId}/status`, { token, method: "PATCH", body: payload });
  },
  deleteObjetivo(token, objetivoId) {
    return request(`/objetivos/${objetivoId}`, { token, method: "DELETE" });
  },
};
