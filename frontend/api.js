function createApiClient({ getBaseUrl, getToken, onUnauthorized }) {
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

  function buildHeaders({ auth = false, json = false } = {}) {
    const headers = {};

    if (json) {
      headers["Content-Type"] = "application/json";
    }

    if (auth) {
      headers.Authorization = `Bearer ${getToken()}`;
    }

    return headers;
  }

  async function request(path, options = {}) {
    try {
      const response = await fetch(`${getBaseUrl()}${path}`, options);
      const result = await parseResponse(response);

      if (result.status === 401 && typeof onUnauthorized === "function") {
        onUnauthorized();
      }

      return result;
    } catch {
      return {
        ok: false,
        status: 0,
        data: { detail: "Não foi possível conectar à API." },
      };
    }
  }

  return {
    healthcheck() {
      return request("/health");
    },
    register(payload) {
      return request("/auth/register", {
        method: "POST",
        headers: buildHeaders({ json: true }),
        body: JSON.stringify(payload),
      });
    },
    login(payload) {
      return request("/auth/login", {
        method: "POST",
        headers: buildHeaders({ json: true }),
        body: JSON.stringify(payload),
      });
    },
    getCurrentUser() {
      return request("/usuarios/me", {
        headers: buildHeaders({ auth: true }),
      });
    },
    listMissions() {
      return request("/missoes", {
        headers: buildHeaders({ auth: true }),
      });
    },
    createMission(payload) {
      return request("/missoes", {
        method: "POST",
        headers: buildHeaders({ auth: true, json: true }),
        body: JSON.stringify(payload),
      });
    },
    completeMission(missionId) {
      return request(`/missoes/${missionId}/concluir`, {
        method: "PATCH",
        headers: buildHeaders({ auth: true }),
      });
    },
    getMissionHistory(missionId) {
      return request(`/missoes/${missionId}/historico`, {
        headers: buildHeaders({ auth: true }),
      });
    },
    removeMission(missionId) {
      return request(`/missoes/${missionId}`, {
        method: "DELETE",
        headers: buildHeaders({ auth: true }),
      });
    },
  };
}
