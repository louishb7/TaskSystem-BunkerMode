import { useCallback, useEffect, useMemo, useState } from "react"

import { getErrorMessage } from "../../../api/httpClient"
import { emptyStatus } from "../../../constants/uiState"
import { api } from "../../../services/bunkermodeApi"

function sortObjetivosByOrder(objetivos = []) {
  return [...objetivos].sort((left, right) => {
    const orderDiff = Number(left.order_index || 0) - Number(right.order_index || 0)
    return orderDiff || Number(left.id || 0) - Number(right.id || 0)
  })
}

export function useObjectives({ onUnauthorized, token }) {
  const [objetivos, setObjetivos] = useState([])
  const [missions, setMissions] = useState([])
  const [loading, setLoading] = useState(false)
  const [mutating, setMutating] = useState(false)
  const [status, setStatus] = useState(emptyStatus)

  const loadObjectives = useCallback(
    async (successMessage = "") => {
      if (!token) {
        return false
      }

      setLoading(true)
      const [objetivosResult, missionsResult] = await Promise.all([
        api.listObjetivos(token),
        api.listMissions(token),
      ])
      setLoading(false)

      if (onUnauthorized?.(objetivosResult) || onUnauthorized?.(missionsResult)) {
        return false
      }

      if (!objetivosResult.ok || !missionsResult.ok) {
        const failedResult = !objetivosResult.ok ? objetivosResult : missionsResult
        setStatus({
          type: "error",
          message: getErrorMessage(failedResult, "Não foi possível carregar objetivos."),
        })
        return false
      }

      setObjetivos(
        sortObjetivosByOrder(Array.isArray(objetivosResult.data) ? objetivosResult.data : [])
      )
      setMissions(Array.isArray(missionsResult.data) ? missionsResult.data : [])
      setStatus(successMessage ? { type: "success", message: successMessage } : emptyStatus)
      return true
    },
    [onUnauthorized, token]
  )

  useEffect(() => {
    loadObjectives()
  }, [loadObjectives])

  const missionsByObjetivo = useMemo(
    () =>
      missions.reduce((byObjetivo, mission) => {
        if (!mission.objetivo_id) {
          return byObjetivo
        }
        const key = String(mission.objetivo_id)
        byObjetivo[key] = [...(byObjetivo[key] || []), mission]
        return byObjetivo
      }, {}),
    [missions]
  )

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
      await loadObjectives()
      return false
    }

    await loadObjectives(successMessage)
    return true
  }

  return {
    loading,
    missionsByObjetivo,
    mutating,
    objetivos,
    refresh: loadObjectives,
    setStatus,
    status,
    createObjetivo: (payload) =>
      mutate(
        () => api.createObjetivo(token, payload),
        "Objetivo registrado.",
        "Não foi possível registrar o objetivo."
      ),
    deleteObjetivo: (objetivoId) =>
      mutate(
        () => api.deleteObjetivo(token, objetivoId),
        "Objetivo removido.",
        "Não foi possível remover o objetivo."
      ),
    reorderObjetivos: (objetivoIds) =>
      mutate(
        () => api.reorderObjetivos(token, { objetivo_ids: objetivoIds }),
        "Organização dos objetivos atualizada.",
        "Não foi possível reordenar os objetivos."
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
  }
}
