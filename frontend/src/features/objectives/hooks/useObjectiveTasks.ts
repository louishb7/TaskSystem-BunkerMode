import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { getErrorMessage } from "../../../api/httpClient"
import { emptyStatus } from "../../../constants/uiState"
import { api } from "../../../services/bunkermodeApi"
import type { Task } from "../../../types/taskContract"

// Falhas desta integração não relacionadas à autenticação são locais.
export function useObjectiveTasks({ token, onUnauthorized, enabled = true }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [formLoading, setFormLoading] = useState(false)
  const [formStatus, setFormStatus] = useState(emptyStatus)
  const requestId = useRef(0)

  const refresh = useCallback(async () => {
    if (!token || !enabled) return false
    const currentRequest = ++requestId.current
    setLoading(true)
    setError("")
    const materialization = await api.materializeTaskRecurrences(token)
    if (currentRequest !== requestId.current) return false
    if (onUnauthorized?.(materialization)) {
      setLoading(false)
      return false
    }
    if (!materialization.ok) {
      setLoading(false)
      setTasks([])
      setError(
        getErrorMessage(
          materialization,
          "Não foi possível preparar tarefas recorrentes vinculadas."
        )
      )
      return false
    }
    const result = await api.listTasks(token)
    if (currentRequest !== requestId.current) return false
    if (onUnauthorized?.(result)) {
      setLoading(false)
      return false
    }
    setLoading(false)
    if (!result.ok) {
      setTasks([])
      setError(getErrorMessage(result, "Não foi possível carregar tarefas vinculadas."))
      return false
    }
    setTasks(result.data)
    return true
  }, [token, onUnauthorized, enabled])

  useEffect(() => {
    setFormLoading(false)
    if (!enabled) {
      setTasks([])
      setLoading(false)
      setError("")
      return
    }
    refresh()
    return () => {
      requestId.current += 1
    }
  }, [refresh, enabled])

  const tasksByObjetivo = useMemo(() => {
    const grouped: Record<string, Task[]> = {}
    for (const task of tasks) {
      if (task.objetivo_id == null) continue
      const key = String(task.objetivo_id)
      grouped[key] ??= []
      grouped[key].push(task)
    }
    return grouped
  }, [tasks])

  async function createTask(payload) {
    if (!enabled || !token || formLoading) return false
    if (!payload.titulo) {
      setFormStatus({ type: "error", message: "Informe o título da tarefa." })
      return false
    }
    setFormLoading(true)
    setFormStatus(emptyStatus)
    const currentRequest = requestId.current
    const result = await api.createTask(token, payload)
    if (currentRequest !== requestId.current) return false
    setFormLoading(false)
    if (onUnauthorized?.(result)) return false
    if (!result.ok) {
      setFormStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível criar a tarefa vinculada."),
      })
      return false
    }
    // Não permite nova submissão de uma tarefa já persistida se a releitura falhar.
    void refresh()
    return true
  }

  return {
    tasksByObjetivo,
    loading,
    error,
    refresh,
    createTask,
    formLoading,
    formStatus,
    setFormStatus,
  }
}
