import { request } from "../api/httpClient.js";
import { assertMissionContract, assertMissionListContract } from "../types/missionContract.js";

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
  listHistoricalMissions(token) {
    return requestMissionList("/missoes/historico", { token });
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
  clearFailureReport(token, payload) {
    return requestMissionList("/relatorios/falhas/limpar", {
      token,
      method: "POST",
      body: payload,
    });
  },
  deleteMission(token, missionId) {
    return request(`/missoes/${missionId}`, { token, method: "DELETE" });
  },
  getMissionHistory(token, missionId) {
    return request(`/missoes/${missionId}/historico`, { token });
  },
};
