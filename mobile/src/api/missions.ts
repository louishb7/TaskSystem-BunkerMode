import { api } from "./client";
import type { CreateMissionPayload, Mission, SoldierBoard } from "@/types/mission";

export function getSoldierBoard() {
  return api.get<SoldierBoard>("/missoes/quadro-soldado");
}

export function listMissions() {
  return api.get<Mission[]>("/missoes");
}

export function createMission(payload: CreateMissionPayload) {
  return api.post<Mission>("/missoes", payload);
}

export function completeMission(missionId: number) {
  return api.patch<Mission>(`/missoes/${missionId}/concluir`);
}
