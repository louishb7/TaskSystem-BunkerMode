import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as missionsApi from "@/api/missions";
import { useAuth } from "@/hooks/useAuth";
import type { CreateMissionPayload, Mission, SoldierBoard } from "@/types/mission";

type Status = {
  message: string;
  type: "error" | "success" | "";
};

const emptyStatus: Status = { message: "", type: "" };

function isCompleted(mission: Mission): boolean {
  return mission.status_code === "CONCLUIDA";
}

function isActionMission(mission: Mission): boolean {
  return mission.permissions?.can_complete === true && !isCompleted(mission);
}

function mergeMissionLists(...missionLists: Mission[][]): Mission[] {
  const missionsById = new Map<number, Mission>();

  for (const mission of missionLists.flat()) {
    if (!mission?.id) {
      continue;
    }
    missionsById.set(mission.id, mission);
  }

  return Array.from(missionsById.values());
}

export function formatDateForApi(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export function normalizeMissionDate(value?: string | null): string {
  if (!value) {
    return "";
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(value)) {
    return value;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split("-");
    return `${day}-${month}-${year}`;
  }

  return value;
}

export function useMissions() {
  const { activeMode, authenticated } = useAuth();
  const [board, setBoard] = useState<SoldierBoard | null>(null);
  const [generalMissions, setGeneralMissions] = useState<Mission[]>([]);
  const [registeredOutcomeMissions, setRegisteredOutcomeMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [completeLoadingId, setCompleteLoadingId] = useState<number | null>(null);
  const [failureLoadingId, setFailureLoadingId] = useState<number | null>(null);
  const [pinLoadingId, setPinLoadingId] = useState<number | null>(null);
  const [reopenLoadingId, setReopenLoadingId] = useState<number | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(null);
  const [operationalTurnAcknowledged, setOperationalTurnAcknowledged] = useState(false);
  const [status, setStatus] = useState<Status>(emptyStatus);
  const requestRef = useRef(0);

  const dailyMissions = useMemo(() => {
    const source = activeMode === "soldier" ? board?.daily_missions || [] : generalMissions;
    return mergeMissionLists(source, registeredOutcomeMissions);
  }, [activeMode, board?.daily_missions, generalMissions, registeredOutcomeMissions]);
  const actionMissions = useMemo(() => (board?.missions || []).filter(isActionMission), [board]);

  const loadSoldierBoard = useCallback(async (successMessage = "", requestId = requestRef.current) => {
    setLoading(true);
    const result = await missionsApi.getSoldierBoard();

    if (requestId !== requestRef.current) {
      return false;
    }

    setLoading(false);

    if (!result.ok) {
      setStatus({ type: "error", message: result.message || "Não foi possível carregar ordens." });
      return false;
    }

    setBoard({
      missions: Array.isArray(result.data.missions) ? result.data.missions : [],
      daily_missions: Array.isArray(result.data.daily_missions) ? result.data.daily_missions : [],
      turn: result.data.turn || null,
    });
    setOperationalTurnAcknowledged((current) => {
      if (!current) {
        return false;
      }
      return result.data.turn?.requires_decision === true;
    });
    setStatus(successMessage ? { type: "success", message: successMessage } : emptyStatus);
    return true;
  }, []);

  const loadGeneralMissions = useCallback(async (successMessage = "", requestId = requestRef.current) => {
    setLoading(true);
    const result = await missionsApi.listMissions();

    if (requestId !== requestRef.current) {
      return false;
    }

    setLoading(false);

    if (!result.ok) {
      setStatus({ type: "error", message: result.message || "Não foi possível carregar o comando." });
      return false;
    }

    setGeneralMissions(Array.isArray(result.data) ? result.data : []);
    setStatus(successMessage ? { type: "success", message: successMessage } : emptyStatus);
    return true;
  }, []);

  const refresh = useCallback(
    async (successMessage = "") => {
      const requestId = requestRef.current + 1;
      requestRef.current = requestId;

      if (!authenticated) {
        setBoard(null);
        setGeneralMissions([]);
        setRegisteredOutcomeMissions([]);
        setStatus(emptyStatus);
        return;
      }

      if (activeMode === "soldier") {
        await loadSoldierBoard(successMessage, requestId);
        return;
      }

      setBoard(null);
      await loadGeneralMissions(successMessage, requestId);
    },
    [activeMode, authenticated, loadGeneralMissions, loadSoldierBoard]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  function continuePreviousOperationalTurn() {
    setOperationalTurnAcknowledged(true);
  }

  async function closePreviousOperationalTurn() {
    setLoading(true);
    setStatus(emptyStatus);
    const result = await missionsApi.closePreviousOperationalTurn();
    setLoading(false);

    if (!result.ok) {
      setStatus({
        type: "error",
        message: result.message || "Não foi possível encerrar as pendências do ciclo anterior.",
      });
      await loadSoldierBoard();
      return false;
    }

    await loadSoldierBoard("Ciclo anterior encerrado.");
    return true;
  }

  async function createMission(payload: CreateMissionPayload) {
    if (!payload.titulo.trim()) {
      setStatus({ type: "error", message: "Informe o título da ordem." });
      return false;
    }

    setFormLoading(true);
    setStatus(emptyStatus);
    const result = await missionsApi.createMission(payload);
    setFormLoading(false);

    if (!result.ok) {
      setStatus({ type: "error", message: result.message || "Não foi possível registrar a ordem." });
      return false;
    }

    await refresh("Ordem registrada.");
    return true;
  }

  async function completeMission(mission: Mission) {
    setCompleteLoadingId(mission.id);
    setStatus(emptyStatus);
    const result = await missionsApi.completeMission(mission.id);
    setCompleteLoadingId(null);

    if (!result.ok) {
      setStatus({ type: "error", message: result.message || "Não foi possível concluir a ordem." });
      await refresh();
      return false;
    }

    setRegisteredOutcomeMissions((current) => mergeMissionLists(current, [result.data]));
    await refresh(activeMode === "soldier" ? "LEÃO ABATIDO" : "Ordem executada.");
    return true;
  }

  async function failMission(mission: Mission) {
    setFailureLoadingId(mission.id);
    setStatus(emptyStatus);
    const result = await missionsApi.failMission(mission.id);
    setFailureLoadingId(null);

    if (!result.ok) {
      setStatus({ type: "error", message: result.message || "Não foi possível registrar a falha." });
      await refresh();
      return false;
    }

    setRegisteredOutcomeMissions((current) => mergeMissionLists(current, [result.data]));
    await refresh(activeMode === "soldier" ? "FALHA REGISTRADA" : "Falha registrada.");
    return true;
  }

  async function toggleMissionPin(mission: Mission) {
    setPinLoadingId(mission.id);
    setStatus(emptyStatus);
    const result = await missionsApi.toggleMissionPin(mission.id);
    setPinLoadingId(null);

    if (!result.ok) {
      setStatus({ type: "error", message: result.message || "Não foi possível subir prioridade." });
      await refresh();
      return false;
    }

    await refresh();
    return true;
  }

  async function reopenMission(mission: Mission) {
    setReopenLoadingId(mission.id);
    setStatus(emptyStatus);
    const result = await missionsApi.reopenMission(mission.id);
    setReopenLoadingId(null);

    if (!result.ok) {
      setStatus({ type: "error", message: result.message || "Não foi possível reabrir a ordem." });
      await refresh();
      return false;
    }

    await refresh("Ordem reaberta.");
    return true;
  }

  async function deleteMission(mission: Mission) {
    setDeleteLoadingId(mission.id);
    setStatus(emptyStatus);
    const result = await missionsApi.deleteMission(mission.id);
    setDeleteLoadingId(null);

    if (!result.ok) {
      setStatus({ type: "error", message: result.message || "Não foi possível remover a ordem." });
      return false;
    }

    await refresh("Ordem removida.");
    return true;
  }

  return {
    actionMissions,
    board,
    closePreviousOperationalTurn,
    completeLoadingId,
    completeMission,
    continuePreviousOperationalTurn,
    createMission,
    dailyMissions,
    deleteLoadingId,
    deleteMission,
    failMission,
    failureLoadingId,
    formLoading,
    generalMissions,
    loading,
    operationalTurnAcknowledged,
    pinLoadingId,
    refresh,
    reopenLoadingId,
    reopenMission,
    setStatus,
    status,
    toggleMissionPin,
  };
}
