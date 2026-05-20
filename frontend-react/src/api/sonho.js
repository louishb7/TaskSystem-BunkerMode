import { request } from "./httpClient.js";

export function listSonhos(token) {
  return request("/sonhos", { token });
}

export function createSonho(token, payload) {
  return request("/sonhos", { token, method: "POST", body: payload });
}

export function updateSonho(token, sonhoId, payload) {
  return request(`/sonhos/${sonhoId}`, { token, method: "PATCH", body: payload });
}

export function archiveSonho(token, sonhoId, payload) {
  return request(`/sonhos/${sonhoId}/arquivar`, { token, method: "POST", body: payload });
}

export function promoteSonho(token, sonhoId) {
  return request(`/sonhos/${sonhoId}/promover`, { token, method: "POST" });
}

