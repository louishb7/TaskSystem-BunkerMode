import { assertMissionContract, assertMissionListContract } from "./missionContract";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v2";

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
      data: { detail: "Resposta invalida ou vazia do servidor." },
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
      data: { detail: "Nao foi possivel conectar a API." },
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
  completeMission(token, missionId) {
    return requestMission(`/missoes/${missionId}/concluir`, { token, method: "PATCH" });
  },
  submitJustification(token, missionId, reason) {
    return requestMission(`/missoes/${missionId}/justificar`, {
      token,
      method: "POST",
      body: { reason },
    });
  },
};
