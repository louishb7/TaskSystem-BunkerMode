import type { Mission } from "./mission";

export type Sonho = {
  id: number;
  titulo: string;
  descricao?: string | null;
  tipo?: "principal" | "secundario";
  status: string;
};

export type Objetivo = {
  id: number;
  titulo: string;
  descricao?: string | null;
  status: string;
  sonho_id?: number | null;
  progresso?: number | null;
  ordem?: number | null;
};

export type MountainResponse = {
  sonhos: Sonho[];
  objetivos: Objetivo[];
  missions: Mission[];
  daily_missions: Mission[];
};
