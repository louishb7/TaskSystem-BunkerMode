import { useEffect, useMemo, useState } from "react";

import { getErrorMessage } from "../../../api/httpClient.js";
import { emptyStatus } from "../../../constants/uiState.js";
import { api } from "../../../services/bunkermodeApi.js";
import { getActionMissions } from "../missionSelectors.js";

export function useMissionBoard({
  activeMode,
  authenticated,
  onUnauthorized,
  token,
}) {
  const [missions, setMissions] = useState([]);
  const [reviewMissions, setReviewMissions] = useState([]);
  const [missionLoading, setMissionLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [reviewLoadingId, setReviewLoadingId] = useState(null);
  const [decisionLoadingId, setDecisionLoadingId] = useState(null);
  const [completeLoadingId, setCompleteLoadingId] = useState(null);
  const [justificationLoadingId, setJustificationLoadingId] = useState(null);
  const [status, setStatus] = useState(emptyStatus);
  const [formStatus, setFormStatus] = useState(emptyStatus);

  const actionMissions = useMemo(() => getActionMissions(missions), [missions]);

  useEffect(() => {
    if (!authenticated) {
      setMissions([]);
      setReviewMissions([]);
      setStatus(emptyStatus);
      setFormStatus(emptyStatus);
      return;
    }

    if (activeMode === "soldier") {
      loadSoldierBoard();
      return;
    }

    loadGeneralBoard();
  }, [authenticated, activeMode, token]);

  async function loadGeneralBoard(successMessage = "") {
    if (!token) {
      return;
    }

    setMissionLoading(true);
    const [missionsResult, reviewResult] = await Promise.all([
      api.listMissions(token),
      api.listReviewMissions(token),
    ]);
    setMissionLoading(false);

    if (onUnauthorized(missionsResult) || onUnauthorized(reviewResult)) {
      return;
    }

    if (!missionsResult.ok) {
      setStatus({
        type: "error",
        message: getErrorMessage(missionsResult, "Não foi possível carregar ordens."),
      });
      return;
    }

    setMissions(missionsResult.data);

    if (reviewResult.ok) {
      setReviewMissions(reviewResult.data);
    } else {
      setReviewMissions([]);
      setStatus({
        type: "error",
        message: getErrorMessage(reviewResult, "Não foi possível carregar pós-ação."),
      });
      return;
    }

    setStatus(successMessage ? { type: "success", message: successMessage } : emptyStatus);
  }

  async function loadSoldierBoard(successMessage = "") {
    if (!token) {
      return;
    }

    setMissionLoading(true);
    const result = await api.listOperationalMissions(token);
    setMissionLoading(false);

    if (onUnauthorized(result)) {
      return;
    }

    if (!result.ok) {
      setStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível carregar ordens."),
      });
      return;
    }

    setMissions(result.data);
    setReviewMissions([]);
    setStatus(successMessage ? { type: "success", message: successMessage } : emptyStatus);
  }

  async function createMission(payload) {
    if (!payload.titulo || !payload.instrucao) {
      setFormStatus({ type: "error", message: "Informe título e instrução." });
      return false;
    }

    setFormLoading(true);
    setFormStatus(emptyStatus);
    const result = await api.createMission(token, payload);
    setFormLoading(false);

    if (onUnauthorized(result)) {
      return false;
    }

    if (!result.ok) {
      setFormStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível registrar a ordem."),
      });
      return false;
    }

    await loadGeneralBoard("Ordem registrada.");
    return true;
  }

  async function updateMission(missionId, payload) {
    if (!payload.titulo || !payload.instrucao) {
      setFormStatus({ type: "error", message: "Informe título e instrução." });
      return false;
    }

    setFormLoading(true);
    setFormStatus(emptyStatus);
    const result = await api.updateMission(token, missionId, payload);
    setFormLoading(false);

    if (onUnauthorized(result)) {
      return false;
    }

    if (!result.ok) {
      setFormStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível salvar a ordem."),
      });
      return false;
    }

    await loadGeneralBoard("Ordem atualizada.");
    return true;
  }

  async function toggleMissionDecision(mission) {
    if (!mission?.id) {
      setStatus({ type: "error", message: "Ordem inválida para alterar Decidida." });
      return false;
    }

    setDecisionLoadingId(mission.id);
    setStatus(emptyStatus);
    const result = await api.toggleMissionDecision(token, mission.id);
    setDecisionLoadingId(null);

    if (onUnauthorized(result)) {
      return false;
    }

    if (!result.ok) {
      setStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível alterar Decidida."),
      });
      return false;
    }

    await loadGeneralBoard();
    return true;
  }

  async function deleteMission(mission) {
    if (!mission?.id) {
      setStatus({ type: "error", message: "Ordem inválida para remoção." });
      return false;
    }

    setStatus(emptyStatus);
    const result = await api.deleteMission(token, mission.id);

    if (onUnauthorized(result)) {
      return false;
    }

    if (!result.ok) {
      setStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível remover a ordem."),
      });
      return false;
    }

    await loadGeneralBoard("Ordem removida.");
    return true;
  }

  async function completeMission(mission) {
    setCompleteLoadingId(mission.id);
    setStatus(emptyStatus);
    const result = await api.completeMission(token, mission.id);
    setCompleteLoadingId(null);

    if (onUnauthorized(result)) {
      return false;
    }

    if (!result.ok) {
      setStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível concluir a ordem."),
      });
      await loadSoldierBoard();
      return false;
    }

    await loadSoldierBoard("EXECUTADO");
    return true;
  }

  async function submitFailureJustification(missionId, payload) {
    setJustificationLoadingId(missionId);
    setStatus(emptyStatus);
    const result = await api.submitFailureJustification(token, missionId, payload);
    setJustificationLoadingId(null);

    if (onUnauthorized(result)) {
      return { error: "Sessão expirada. Faça login novamente." };
    }

    if (!result.ok) {
      const message = getErrorMessage(result, "Não foi possível registrar a justificativa.");
      setStatus({ type: "error", message });
      await loadSoldierBoard();
      return { error: message };
    }

    await loadSoldierBoard("JUSTIFICATIVA REGISTRADA");
    return { ok: true };
  }

  async function submitGeneralReview(missionId, accepted) {
    setReviewLoadingId(missionId);
    setStatus(emptyStatus);
    const result = await api.submitGeneralReview(token, missionId, { accepted });
    setReviewLoadingId(null);

    if (onUnauthorized(result)) {
      return false;
    }

    if (!result.ok) {
      setStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível revisar a falha."),
      });
      return false;
    }

    await loadGeneralBoard();
    return true;
  }

  return {
    actionMissions,
    completeLoadingId,
    completeMission,
    createMission,
    decisionLoadingId,
    deleteMission,
    formLoading,
    formStatus,
    justificationLoadingId,
    missionLoading,
    missions,
    reviewLoadingId,
    reviewMissions,
    setFormStatus,
    setStatus,
    status,
    submitFailureJustification,
    submitGeneralReview,
    toggleMissionDecision,
    updateMission,
  };
}
