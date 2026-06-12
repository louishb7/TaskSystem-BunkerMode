import { useCallback, useEffect, useMemo, useState } from "react";
import * as missionsApi from "@/api/missions";
import type { CreateMissionPayload, Mission, SoldierBoard } from "@/types/mission";

type Status = {
  message: string;
  type: "error" | "success" | "";
};

const emptyStatus: Status = { message: "", type: "" };

function todayApiDate(): string {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();
  return `${day}-${month}-${year}`;
}

function isActionMission(mission: Mission): boolean {
  return mission.permissions?.can_complete === true && mission.status_code !== "CONCLUIDA";
}

export function useMissions() {
  const [board, setBoard] = useState<SoldierBoard | null>(null);
  const [generalMissions, setGeneralMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [status, setStatus] = useState<Status>(emptyStatus);

  const actionMissions = useMemo(() => (board?.missions || []).filter(isActionMission), [board]);

  const loadSoldierBoard = useCallback(async (successMessage = "") => {
    setLoading(true);
    const result = await missionsApi.getSoldierBoard();
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
    setStatus(successMessage ? { type: "success", message: successMessage } : emptyStatus);
    return true;
  }, []);

  const loadGeneralMissions = useCallback(async () => {
    const result = await missionsApi.listMissions();
    if (!result.ok) {
      setStatus({ type: "error", message: result.message || "Não foi possível carregar o comando." });
      return false;
    }
    setGeneralMissions(Array.isArray(result.data) ? result.data : []);
    return true;
  }, []);

  useEffect(() => {
    loadSoldierBoard();
    loadGeneralMissions();
  }, [loadGeneralMissions, loadSoldierBoard]);

  async function completeMission(mission: Mission) {
    setMutating(true);
    setStatus(emptyStatus);
    const result = await missionsApi.completeMission(mission.id);
    setMutating(false);

    if (!result.ok) {
      setStatus({ type: "error", message: result.message || "Não foi possível concluir a ordem." });
      await loadSoldierBoard();
      return false;
    }

    await loadSoldierBoard("LEÃO ABATIDO");
    await loadGeneralMissions();
    return true;
  }

  async function createQuickMission(title: string) {
    const titulo = title.trim();
    if (!titulo) {
      setStatus({ type: "error", message: "Informe o título da ordem." });
      return false;
    }

    const payload: CreateMissionPayload = {
      titulo,
      instrucao: "",
      prazo: todayApiDate(),
      objetivo_id: null,
      sonho_id: null,
      recurrence_weekdays: null,
      duration_type: null,
      recurrence_end_date: null,
    };

    setMutating(true);
    setStatus(emptyStatus);
    const result = await missionsApi.createMission(payload);
    setMutating(false);

    if (!result.ok) {
      setStatus({ type: "error", message: result.message || "Não foi possível registrar a ordem." });
      return false;
    }

    await loadSoldierBoard("Ordem registrada.");
    await loadGeneralMissions();
    return true;
  }

  return {
    actionMissions,
    board,
    completeMission,
    createQuickMission,
    dailyMissions: board?.daily_missions || [],
    generalMissions,
    loading,
    mutating,
    refresh: loadSoldierBoard,
    status,
  };
}
