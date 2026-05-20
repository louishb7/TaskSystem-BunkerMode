import { request } from "./httpClient.js";

export function listObjetivos(token) {
  return request("/objetivos", { token });
}

export function createObjetivo(token, payload) {
  return request("/objetivos", { token, method: "POST", body: payload });
}

export function updateObjetivo(token, objetivoId, payload) {
  return request(`/objetivos/${objetivoId}`, { token, method: "PATCH", body: payload });
}

export function updateObjetivoProgresso(token, objetivoId, payload) {
  return request(`/objetivos/${objetivoId}/progresso`, { token, method: "PATCH", body: payload });
}

export function updateObjetivoStatus(token, objetivoId, payload) {
  return request(`/objetivos/${objetivoId}/status`, { token, method: "PATCH", body: payload });
}

export function deleteObjetivo(token, objetivoId) {
  return request(`/objetivos/${objetivoId}`, { token, method: "DELETE" });
}

