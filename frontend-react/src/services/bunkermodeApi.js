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
  listMissions(token) {
    return requestMissionList("/missoes", { token });
  },
  listOperationalMissions(token) {
    return requestMissionList("/missoes/operacionais", { token });
  },
  listDailyMissions(token) {
    return requestMissionList("/missoes/dia-operacional", { token });
  },
  getOperationalTurn(token) {
    return request("/missoes/turno-operacional", { token });
  },
  closePreviousOperationalTurn(token) {
    return request("/missoes/turno-operacional/encerrar-pendencias", { token, method: "POST" });
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
  toggleMissionPin(token, missionId) {
    return requestMission(`/missoes/${missionId}/toggle-pin`, {
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
  deleteOperation(token, operationId) {
    return request(`/operacoes/${operationId}`, { token, method: "DELETE" });
  },
  materializeOperations(token, payload) {
    return request("/operacoes/materializar", { token, method: "POST", body: payload });
  },
  deleteMission(token, missionId) {
    return request(`/missoes/${missionId}`, { token, method: "DELETE" });
  },
  getMissionHistory(token, missionId) {
    return request(`/missoes/${missionId}/historico`, { token });
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
  archiveSonho(token, sonhoId, payload) {
    return request(`/sonhos/${sonhoId}/arquivar`, { token, method: "POST", body: payload });
  },
  promoteSonho(token, sonhoId) {
    return request(`/sonhos/${sonhoId}/promover`, { token, method: "POST" });
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
