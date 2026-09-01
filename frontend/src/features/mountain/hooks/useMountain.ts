import { useCallback, useEffect, useState } from "react"

import { getErrorMessage } from "../../../api/httpClient"
import { emptyStatus } from "../../../constants/uiState"
import { api } from "../../../services/bunkermodeApi"

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
  const [missions, setMissions] = useState([])
  const [loading, setLoading] = useState(false)
  const [mutating, setMutating] = useState(false)
  const [status, setStatus] = useState(emptyStatus)

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
    sonhos,
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
    createMission: (payload) =>
      mutate(
        () => api.createMission(token, payload),
        "Ordem registrada.",
        "Não foi possível registrar a ordem."
      ),
  }
}
