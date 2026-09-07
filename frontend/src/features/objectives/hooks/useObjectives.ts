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
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)
  const [mutating, setMutating] = useState(false)
  const [status, setStatus] = useState(emptyStatus)

  const loadObjectives = useCallback(
    async (successMessage = "") => {
      if (!token) {
        return false
      }

      setLoading(true)
      const [objetivosResult, tasksResult] = await Promise.all([
        api.listObjetivos(token),
        api.listTasks(token),
      ])
      setLoading(false)

      if (onUnauthorized?.(objetivosResult) || onUnauthorized?.(tasksResult)) {
        return false
      }

      if (!objetivosResult.ok || !tasksResult.ok) {
        const failedResult = !objetivosResult.ok ? objetivosResult : tasksResult
        setStatus({
          type: "error",
          message: getErrorMessage(failedResult, "Não foi possível carregar objetivos."),
        })
        return false
      }

      setObjetivos(
        sortObjetivosByOrder(Array.isArray(objetivosResult.data) ? objetivosResult.data : [])
      )
      setTasks(Array.isArray(tasksResult.data) ? tasksResult.data : [])
      setStatus(successMessage ? { type: "success", message: successMessage } : emptyStatus)
      return true
    },
    [onUnauthorized, token]
  )

  useEffect(() => {
    loadObjectives()
  }, [loadObjectives])

  const tasksByObjetivo = useMemo(
    () =>
      tasks.reduce((byObjetivo, task) => {
        if (!task.objetivo_id) {
          return byObjetivo
        }
        const key = String(task.objetivo_id)
        byObjetivo[key] = [...(byObjetivo[key] || []), task]
        return byObjetivo
      }, {}),
    [tasks]
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
    tasksByObjetivo,
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
