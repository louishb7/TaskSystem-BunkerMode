import { useEffect, useMemo, useRef, useState } from "react";

import { getErrorMessage } from "../../../api/httpClient.js";
import { emptyStatus } from "../../../constants/uiState.js";
import { api } from "../../../services/bunkermodeApi.js";
import { getActionMissions } from "../missionSelectors.js";

function mergeMissionLists(...missionLists) {
  const missionsById = new Map();

  missionLists.flat().forEach((mission) => {
    if (!mission?.id) {
      return;
    }

    missionsById.set(mission.id, mission);
  });

  return Array.from(missionsById.values());
}

export function useMissionBoard({
  activeMode,
  authenticated,
  onUnauthorized,
  token,
}) {
  const [missions, setMissions] = useState([]);
  const [reviewMissions, setReviewMissions] = useState([]);
  const [historicalMissions, setHistoricalMissions] = useState([]);
  const [dailyProgressMissions, setDailyProgressMissions] = useState([]);
  const [registeredOutcomeMissions, setRegisteredOutcomeMissions] = useState([]);
  const [operationalTurn, setOperationalTurn] = useState(null);
  const [operationalTurnAcknowledged, setOperationalTurnAcknowledged] = useState(false);
  const [reviewState, setReviewState] = useState(null);
  const [weeklyReviews, setWeeklyReviews] = useState([]);
  const [operations, setOperations] = useState([]);
  const [operationLoading, setOperationLoading] = useState(false);
  const [operationStatus, setOperationStatus] = useState(emptyStatus);
  const [missionLoading, setMissionLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [reviewLoadingId, setReviewLoadingId] = useState(null);
  const [decisionLoadingId, setDecisionLoadingId] = useState(null);
  const [completeLoadingId, setCompleteLoadingId] = useState(null);
  const [justificationLoadingId, setJustificationLoadingId] = useState(null);
  const [status, setStatus] = useState(emptyStatus);
  const [formStatus, setFormStatus] = useState(emptyStatus);
  const materializingOperationsRef = useRef(new Set());

  const actionMissions = useMemo(() => getActionMissions(missions), [missions]);
  const dailyMissions = useMemo(
    () => mergeMissionLists(
      missions,
      dailyProgressMissions,
      reviewMissions,
      historicalMissions,
      registeredOutcomeMissions
    ),
    [dailyProgressMissions, historicalMissions, missions, registeredOutcomeMissions, reviewMissions]
  );

  useEffect(() => {
    if (!authenticated) {
      setMissions([]);
      setReviewMissions([]);
      setHistoricalMissions([]);
      setDailyProgressMissions([]);
      setRegisteredOutcomeMissions([]);
      setOperationalTurn(null);
      setOperationalTurnAcknowledged(false);
      setReviewState(null);
      setWeeklyReviews([]);
      setOperations([]);
      setOperationStatus(emptyStatus);
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
    const [
      missionsResult,
      reviewResult,
      historicalResult,
      reviewStateResult,
      weeklyReviewsResult,
      operationsResult,
    ] = await Promise.all([
      api.listMissions(token),
      api.listReviewMissions(token),
      api.listHistoricalMissions(token),
      api.getReviewState(token),
      api.listWeeklyReviews(token),
      api.listOperations(token),
    ]);
    setMissionLoading(false);

    if (
      onUnauthorized(missionsResult)
      || onUnauthorized(reviewResult)
      || onUnauthorized(historicalResult)
      || onUnauthorized(reviewStateResult)
      || onUnauthorized(weeklyReviewsResult)
      || onUnauthorized(operationsResult)
    ) {
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
        message: getErrorMessage(reviewResult, "Não foi possível carregar relatório."),
      });
      return;
    }

    if (historicalResult.ok) {
      setHistoricalMissions(historicalResult.data);
    } else {
      setHistoricalMissions([]);
      setStatus({
        type: "error",
        message: getErrorMessage(historicalResult, "Não foi possível carregar histórico."),
      });
      return;
    }

    if (reviewStateResult.ok) {
      setReviewState(reviewStateResult.data);
    } else {
      setReviewState(null);
      setStatus({
        type: "error",
        message: getErrorMessage(reviewStateResult, "Não foi possível carregar a revisão semanal."),
      });
      return;
    }

    if (weeklyReviewsResult.ok) {
      setWeeklyReviews(Array.isArray(weeklyReviewsResult.data) ? weeklyReviewsResult.data : []);
    } else {
      setWeeklyReviews([]);
      setStatus({
        type: "error",
        message: getErrorMessage(weeklyReviewsResult, "Não foi possível carregar o histórico de revisões."),
      });
      return;
    }

    if (operationsResult.ok) {
      setOperations(Array.isArray(operationsResult.data) ? operationsResult.data : []);
    } else {
      setOperations([]);
      setStatus({
        type: "error",
        message: getErrorMessage(operationsResult, "Não foi possível carregar operações."),
      });
      return;
    }

    setDailyProgressMissions([]);
    setRegisteredOutcomeMissions([]);
    setOperationalTurn(null);
    setOperationalTurnAcknowledged(false);
    setStatus(successMessage ? { type: "success", message: successMessage } : emptyStatus);
  }

  async function loadSoldierBoard(successMessage = "") {
    if (!token) {
      return;
    }

    setMissionLoading(true);
    const [result, dailyResult, turnResult] = await Promise.all([
      api.listOperationalMissions(token),
      api.listDailyMissions(token),
      api.getOperationalTurn(token),
    ]);
    setMissionLoading(false);

    if (onUnauthorized(result) || onUnauthorized(dailyResult) || onUnauthorized(turnResult)) {
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
    if (dailyResult.ok) {
      setDailyProgressMissions(dailyResult.data);
    } else {
      setDailyProgressMissions(result.data);
      setStatus({
        type: "error",
        message: getErrorMessage(dailyResult, "Não foi possível carregar a caçada do dia."),
      });
      return;
    }
    if (turnResult.ok) {
      setOperationalTurn(turnResult.data);
      setOperationalTurnAcknowledged((current) => {
        if (!current) {
          return false;
        }
        return turnResult.data?.requires_decision === true;
      });
    } else {
      setOperationalTurn(null);
      setStatus({
        type: "error",
        message: getErrorMessage(turnResult, "Não foi possível ler o turno operacional."),
      });
      return;
    }
    setReviewMissions([]);
    setHistoricalMissions([]);
    setReviewState(null);
    setWeeklyReviews([]);
    setOperations([]);
    setOperationStatus(emptyStatus);
    setStatus(successMessage ? { type: "success", message: successMessage } : emptyStatus);
  }

  function continuePreviousOperationalTurn() {
    setOperationalTurnAcknowledged(true);
  }

  async function closePreviousOperationalTurn() {
    if (!token || missionLoading) {
      return false;
    }

    setMissionLoading(true);
    setStatus(emptyStatus);
    const result = await api.closePreviousOperationalTurn(token);
    setMissionLoading(false);

    if (onUnauthorized(result)) {
      return false;
    }

    if (!result.ok) {
      setStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível encerrar as pendências do ciclo anterior."),
      });
      await loadSoldierBoard();
      return false;
    }

    setOperationalTurn(result.data);
    setOperationalTurnAcknowledged(false);
    await loadSoldierBoard("Ciclo anterior encerrado.");
    return true;
  }

  async function materializeOperations(payload) {
    if (!token) {
      return false;
    }
    const key = `${payload?.start_date || ""}:${payload?.end_date || ""}`;
    if (materializingOperationsRef.current.has(key)) {
      return true;
    }

    materializingOperationsRef.current.add(key);
    try {
      const result = await api.materializeOperations(token, payload);
      if (onUnauthorized(result)) {
        return false;
      }
      if (!result.ok) {
        setStatus({
          type: "error",
          message: getErrorMessage(result, "Não foi possível preparar as ordens da operação."),
        });
        return false;
      }
      await loadGeneralBoard();
      return true;
    } finally {
      materializingOperationsRef.current.delete(key);
    }
  }

  async function createOperation(payload) {
    if (operationLoading) {
      return false;
    }
    setOperationLoading(true);
    setOperationStatus(emptyStatus);
    const result = await api.createOperation(token, payload);
    setOperationLoading(false);

    if (onUnauthorized(result)) {
      return false;
    }

    if (!result.ok) {
      setOperationStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível registrar a operação."),
      });
      return false;
    }

    await loadGeneralBoard("Operação registrada.");
    setOperationStatus({ type: "success", message: "Operação registrada." });
    return true;
  }

  async function closeOperation(operationId) {
    if (operationLoading) {
      return false;
    }
    setOperationLoading(true);
    setOperationStatus(emptyStatus);
    const result = await api.closeOperation(token, operationId);
    setOperationLoading(false);

    if (onUnauthorized(result)) {
      return false;
    }

    if (!result.ok) {
      setOperationStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível encerrar a operação."),
      });
      return false;
    }

    await loadGeneralBoard("Operação encerrada.");
    setOperationStatus({ type: "success", message: "Operação encerrada." });
    return true;
  }

  async function deleteOperation(operationId) {
    if (operationLoading) {
      return false;
    }
    setOperationLoading(true);
    setOperationStatus(emptyStatus);
    const result = await api.deleteOperation(token, operationId);
    setOperationLoading(false);

    if (onUnauthorized(result)) {
      return false;
    }

    if (!result.ok) {
      setOperationStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível cancelar a operação."),
      });
      return false;
    }

    await loadGeneralBoard("Operação cancelada.");
    setOperationStatus({ type: "success", message: "Operação cancelada." });
    return true;
  }

  async function createMission(payload) {
    if (!payload.titulo) {
      setFormStatus({ type: "error", message: "Informe o título da ordem." });
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
    if (!payload.titulo) {
      setFormStatus({ type: "error", message: "Informe o título da ordem." });
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
    setRegisteredOutcomeMissions((current) => mergeMissionLists(current, [result.data]));
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
    setRegisteredOutcomeMissions((current) => mergeMissionLists(current, [result.data]));
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

  async function clearFailureReport(payload) {
    setStatus(emptyStatus);
    const result = await api.clearFailureReport(token, payload);

    if (onUnauthorized(result)) {
      return false;
    }

    if (!result.ok) {
      setStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível limpar o relatório de falhas."),
      });
      await loadGeneralBoard();
      return false;
    }

    await loadGeneralBoard("Relatório de falhas limpo.");
    return true;
  }

  async function closeWeeklyReview(payload) {
    setStatus(emptyStatus);
    const result = await api.closeWeeklyReview(token, payload);

    if (onUnauthorized(result)) {
      return false;
    }

    if (!result.ok) {
      setStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível fechar a revisão do General."),
      });
      await loadGeneralBoard();
      return false;
    }

    await loadGeneralBoard("Revisão do General fechada.");
    return true;
  }

  return {
    actionMissions,
    clearFailureReport,
    closeWeeklyReview,
    closeOperation,
    closePreviousOperationalTurn,
    completeLoadingId,
    completeMission,
    createOperation,
    createMission,
    continuePreviousOperationalTurn,
    dailyMissions,
    decisionLoadingId,
    deleteOperation,
    deleteMission,
    formLoading,
    formStatus,
    hasRegisteredOutcomes: registeredOutcomeMissions.length > 0,
    justificationLoadingId,
    missionLoading,
    missions,
    materializeOperations,
    operationLoading,
    operationStatus,
    operationalTurn,
    operationalTurnAcknowledged,
    operations,
    reviewLoadingId,
    reviewMissions,
    reviewState,
    setFormStatus,
    setStatus,
    status,
    submitFailureJustification,
    submitGeneralReview,
    toggleMissionDecision,
    updateMission,
    weeklyReviews,
  };
}
