import { assertMissionContract, assertMissionListContract } from "../utils/missionContract.js";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v2";

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
  register(payload) {
    return request("/auth/register", { method: "POST", body: payload });
  },
  login(payload) {
    return request("/auth/login", { method: "POST", body: payload });
  },
  getCurrentUser(token) {
    return request("/usuarios/me", { token });
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
  unlockGeneral(token, payload) {
    return request("/session/unlock-general", {
      token,
      method: "POST",
      body: payload,
    });
  },
  listMissions(token) {
    return requestMissionList("/missoes", { token });
  },
  listOperationalMissions(token) {
    return requestMissionList("/missoes/operacionais", { token });
  },
  listReviewMissions(token) {
    return requestMissionList("/missoes/revisao", { token });
  },
  createMission(token, payload) {
    return requestMission("/missoes", { token, method: "POST", body: payload });
  },
  updateMission(token, missionId, payload) {
    return requestMission(`/missoes/${missionId}`, { token, method: "PATCH", body: payload });
  },
  completeMission(token, missionId) {
    return requestMission(`/missoes/${missionId}/concluir`, { token, method: "PATCH" });
  },
  toggleMissionDecision(token, missionId) {
    return requestMission(`/missoes/${missionId}/toggle-decided`, {
      token,
      method: "PATCH",
    });
  },
  submitSoldierExcuse(token, missionId, payload) {
    return requestMission(`/missoes/${missionId}/justificar`, {
      token,
      method: "POST",
      body: payload,
    });
  },
  submitFailureJustification(token, missionId, payload) {
    return requestMission(`/missoes/${missionId}/justification`, {
      token,
      method: "POST",
      body: payload,
    });
  },
  submitGeneralReview(token, missionId, payload) {
    return requestMission(`/missoes/${missionId}/revisar`, {
      token,
      method: "POST",
      body: payload,
    });
  },
  submitGeneralVerdict(token, missionId, payload) {
    return requestMission(`/missoes/${missionId}/general-verdict`, {
      token,
      method: "POST",
      body: payload,
    });
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
  deleteMission(token, missionId) {
    return request(`/missoes/${missionId}`, { token, method: "DELETE" });
  },
  getMissionHistory(token, missionId) {
    return request(`/missoes/${missionId}/historico`, { token });
  },
};
