import { useCallback, useEffect, useMemo, useState } from "react";
import * as mountainApi from "@/api/mountain";
import type { Mission } from "@/types/mission";
import type { MountainResponse, Objetivo, Sonho } from "@/types/mountain";

type Status = {
  message: string;
  type: "error" | "success" | "";
};

export function useMountain() {
  const [data, setData] = useState<MountainResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>({ message: "", type: "" });

  const loadMountain = useCallback(async () => {
    setLoading(true);
    const result = await mountainApi.getMountain();
    setLoading(false);

    if (!result.ok) {
      setStatus({ type: "error", message: result.message || "Não foi possível carregar a Montanha." });
      return false;
    }

    setData({
      sonhos: Array.isArray(result.data.sonhos) ? result.data.sonhos : [],
      objetivos: Array.isArray(result.data.objetivos) ? result.data.objetivos : [],
      missions: Array.isArray(result.data.missions) ? result.data.missions : [],
      daily_missions: Array.isArray(result.data.daily_missions) ? result.data.daily_missions : [],
    });
    setStatus({ message: "", type: "" });
    return true;
  }, []);

  useEffect(() => {
    loadMountain();
  }, [loadMountain]);

  const sonhoPrincipal = useMemo<Sonho | null>(
    () => data?.sonhos.find((sonho) => sonho.status === "ativo" && sonho.tipo === "principal") || null,
    [data]
  );

  const objetivos = useMemo<Objetivo[]>(() => {
    return [...(data?.objetivos || [])].sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));
  }, [data]);

  const missionsByObjetivo = useMemo(() => {
    const grouped = new Map<number, Mission[]>();
    for (const mission of data?.missions || []) {
      if (!mission.objetivo_id) {
        continue;
      }
      const current = grouped.get(mission.objetivo_id) || [];
      current.push(mission);
      grouped.set(mission.objetivo_id, current);
    }
    return grouped;
  }, [data]);

  return {
    loading,
    missionsByObjetivo,
    objetivos,
    refresh: loadMountain,
    sonhoPrincipal,
    status,
  };
}
