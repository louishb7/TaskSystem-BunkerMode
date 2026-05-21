import { useEffect, useMemo, useState } from "react";

import { getErrorMessage } from "../../../api/httpClient.js";
import { emptyStatus } from "../../../constants/uiState.js";
import { api } from "../../../services/bunkermodeApi.js";

export function useMountain({ onUnauthorized, token }) {
  const [sonhos, setSonhos] = useState([]);
  const [objetivos, setObjetivos] = useState([]);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [status, setStatus] = useState(emptyStatus);

  const sonhosAtivos = useMemo(
    () => sonhos.filter((sonho) => sonho.status === "ativo"),
    [sonhos]
  );

  useEffect(() => {
    loadMountain();
  }, [token]);

  async function loadMountain(successMessage = "") {
    if (!token) {
      return false;
    }
    setLoading(true);
    const [sonhosResult, objetivosResult, missionsResult] = await Promise.all([
      api.listSonhos(token),
      api.listObjetivos(token),
      api.listMissions(token),
    ]);
    setLoading(false);

    if (onUnauthorized?.(sonhosResult) || onUnauthorized?.(objetivosResult) || onUnauthorized?.(missionsResult)) {
      return false;
    }

    if (!sonhosResult.ok) {
      setStatus({ type: "error", message: getErrorMessage(sonhosResult, "Não foi possível carregar sonhos.") });
      return false;
    }
    if (!objetivosResult.ok) {
      setStatus({ type: "error", message: getErrorMessage(objetivosResult, "Não foi possível carregar objetivos.") });
      return false;
    }
    if (!missionsResult.ok) {
      setStatus({ type: "error", message: getErrorMessage(missionsResult, "Não foi possível carregar missões da montanha.") });
      return false;
    }

    setSonhos(Array.isArray(sonhosResult.data) ? sonhosResult.data : []);
    setObjetivos(Array.isArray(objetivosResult.data) ? objetivosResult.data : []);
    setMissions(Array.isArray(missionsResult.data) ? missionsResult.data : []);
    setStatus(successMessage ? { type: "success", message: successMessage } : emptyStatus);
    return true;
  }

  async function mutate(action, successMessage, fallbackMessage) {
    if (mutating) {
      return false;
    }
    setMutating(true);
    setStatus(emptyStatus);
    const result = await action();
    setMutating(false);

    if (onUnauthorized?.(result)) {
      return false;
    }

    if (!result.ok) {
      setStatus({ type: "error", message: getErrorMessage(result, fallbackMessage) });
      await loadMountain();
      return false;
    }

    await loadMountain(successMessage);
    return true;
  }

  return {
    loading,
    missions,
    mutating,
    objetivos,
    sonhos,
    sonhosAtivos,
    status,
    setStatus,
    createSonho: (payload) => mutate(
      () => api.createSonho(token, payload),
      "Sonho registrado.",
      "Não foi possível registrar o sonho."
    ),
    updateSonho: (sonhoId, payload) => mutate(
      () => api.updateSonho(token, sonhoId, payload),
      "Sonho atualizado.",
      "Não foi possível atualizar o sonho."
    ),
    archiveSonho: (sonhoId, payload) => mutate(
      () => api.archiveSonho(token, sonhoId, payload),
      "Campanha arquivada.",
      "Não foi possível arquivar a campanha."
    ),
    promoteSonho: (sonhoId) => mutate(
      () => api.promoteSonho(token, sonhoId),
      "Sonho promovido a principal.",
      "Não foi possível promover o sonho."
    ),
    createObjetivo: (payload) => mutate(
      () => api.createObjetivo(token, payload),
      "Objetivo registrado.",
      "Não foi possível registrar o objetivo."
    ),
    updateObjetivo: (objetivoId, payload) => mutate(
      () => api.updateObjetivo(token, objetivoId, payload),
      "Objetivo atualizado.",
      "Não foi possível atualizar o objetivo."
    ),
    updateObjetivoProgresso: (objetivoId, progresso) => mutate(
      () => api.updateObjetivoProgresso(token, objetivoId, { progresso }),
      "Progresso atualizado.",
      "Não foi possível atualizar o progresso."
    ),
    updateObjetivoStatus: (objetivoId, objetivoStatus) => mutate(
      () => api.updateObjetivoStatus(token, objetivoId, { status: objetivoStatus }),
      "Status atualizado.",
      "Não foi possível atualizar o status."
    ),
    deleteObjetivo: (objetivoId) => mutate(
      () => api.deleteObjetivo(token, objetivoId),
      "Objetivo removido.",
      "Não foi possível remover o objetivo."
    ),
  };
}
