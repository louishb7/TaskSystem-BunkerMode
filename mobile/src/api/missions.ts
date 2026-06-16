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

export function toggleMissionPin(missionId: number) {
  return api.patch<Mission>(`/missoes/${missionId}/toggle-pin`);
}

export function failMission(missionId: number) {
  return api.post<Mission>(`/missoes/${missionId}/falhar`);
}

export function reopenMission(missionId: number) {
  return api.patch<Mission>(`/missoes/${missionId}`, { status: "Pendente" });
}

export function deleteMission(missionId: number) {
  return api.delete<unknown>(`/missoes/${missionId}`);
}

export function closePreviousOperationalTurn() {
  return api.post<SoldierBoard["turn"]>("/missoes/turno-operacional/encerrar-pendencias");
}
