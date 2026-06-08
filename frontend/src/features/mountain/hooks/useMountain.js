import { useCallback, useEffect, useMemo, useState } from "react"

import { getErrorMessage } from "../../../api/httpClient.js"
import { emptyStatus } from "../../../constants/uiState.js"
import { api } from "../../../services/bunkermodeApi.js"

function mergeMissions(...missionLists) {
  const byId = new Map()
  missionLists.flat().forEach((mission) => {
    if (!mission?.id) {
      return
    }
    byId.set(mission.id, mission)
  })
  return Array.from(byId.values())
}

export function useMountain({ onUnauthorized, token }) {
  const [sonhos, setSonhos] = useState([])
  const [objetivos, setObjetivos] = useState([])
  const [missions, setMissions] = useState([])
  const [loading, setLoading] = useState(false)
  const [mutating, setMutating] = useState(false)
  const [status, setStatus] = useState(emptyStatus)

  const sonhosAtivos = useMemo(() => sonhos.filter((sonho) => sonho.status === "ativo"), [sonhos])

  const loadMountain = useCallback(
    async (successMessage = "") => {
      if (!token) {
        return false
      }
      setLoading(true)
      const result = await api.getMountain(token)
      setLoading(false)

      if (onUnauthorized?.(result)) {
        return false
      }

      if (!result.ok) {
        setStatus({
          type: "error",
          message: getErrorMessage(result, "Não foi possível carregar a Montanha."),
        })
        return false
      }

      setSonhos(Array.isArray(result.data?.sonhos) ? result.data.sonhos : [])
      setObjetivos(Array.isArray(result.data?.objetivos) ? result.data.objetivos : [])
      setMissions(
        mergeMissions(
          Array.isArray(result.data?.missions) ? result.data.missions : [],
          Array.isArray(result.data?.daily_missions) ? result.data.daily_missions : []
        )
      )
      setStatus(successMessage ? { type: "success", message: successMessage } : emptyStatus)
      return true
    },
    [onUnauthorized, token]
  )

  useEffect(() => {
    loadMountain()
  }, [loadMountain])

  async function mutate(action, successMessage, fallbackMessage) {
    if (mutating) {
      return false
    }
    setMutating(true)
    setStatus(emptyStatus)
    const result = await action()
    setMutating(false)

    if (onUnauthorized?.(result)) {
      return false
    }

    if (!result.ok) {
      setStatus({ type: "error", message: getErrorMessage(result, fallbackMessage) })
      await loadMountain()
      return false
    }

    await loadMountain(successMessage)
    return true
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
    createSonho: (payload) =>
      mutate(
        () => api.createSonho(token, payload),
        "Sonho registrado.",
        "Não foi possível registrar o sonho."
      ),
    updateSonho: (sonhoId, payload) =>
      mutate(
        () => api.updateSonho(token, sonhoId, payload),
        "Sonho atualizado.",
        "Não foi possível atualizar o sonho."
      ),
    archiveSonho: (sonhoId, payload) =>
      mutate(
        () => api.archiveSonho(token, sonhoId, payload),
        "Campanha arquivada.",
        "Não foi possível arquivar a campanha."
      ),
    promoteSonho: (sonhoId) =>
      mutate(
        () => api.promoteSonho(token, sonhoId),
        "Sonho promovido a principal.",
        "Não foi possível promover o sonho."
      ),
    createObjetivo: (payload) =>
      mutate(
        () => api.createObjetivo(token, payload),
        "Objetivo registrado.",
        "Não foi possível registrar o objetivo."
      ),
    updateObjetivo: (objetivoId, payload) =>
      mutate(
        () => api.updateObjetivo(token, objetivoId, payload),
        "Objetivo atualizado.",
        "Não foi possível atualizar o objetivo."
      ),
    updateObjetivoStatus: (objetivoId, objetivoStatus) =>
      mutate(
        () => api.updateObjetivoStatus(token, objetivoId, { status: objetivoStatus }),
        "Status atualizado.",
        "Não foi possível atualizar o status."
      ),
    reorderObjetivos: (objetivoIds) =>
      mutate(
        () => api.reorderObjetivos(token, { objetivo_ids: objetivoIds }),
        "Ordem dos objetivos atualizada.",
        "Não foi possível reordenar os objetivos."
      ),
    deleteObjetivo: (objetivoId) =>
      mutate(
        () => api.deleteObjetivo(token, objetivoId),
        "Objetivo removido.",
        "Não foi possível remover o objetivo."
      ),
    createMission: (payload) =>
      mutate(
        () => api.createMission(token, payload),
        "Ordem registrada.",
        "Não foi possível registrar a ordem."
      ),
  }
}
