import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { getErrorMessage } from "../../../api/httpClient"
import { emptyStatus } from "../../../constants/uiState"
import { api } from "../../../services/bunkermodeApi"
import { getActionMissions } from "../missionSelectors"

export function useMissionBoard({ authenticated, boardMode, onUnauthorized, token }) {
  const [missions, setMissions] = useState([])
  const [missionLoading, setMissionLoading] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [pinLoadingId, setPinLoadingId] = useState(null)
  const [completeLoadingId, setCompleteLoadingId] = useState(null)
  const [reopenLoadingId, setReopenLoadingId] = useState(null)
  const [failLoadingId, setFailLoadingId] = useState(null)
  const [status, setStatus] = useState(emptyStatus)
  const [formStatus, setFormStatus] = useState(emptyStatus)
  const loadRequestRef = useRef(0)

  const actionMissions = useMemo(() => getActionMissions(missions), [missions])
  const dailyMissions = missions

  const loadTasksBoard = useCallback(
    async (successMessage = "") => {
      if (!token) {
        return
      }

      const requestId = loadRequestRef.current + 1
      loadRequestRef.current = requestId
      setMissionLoading(true)
      const missionsResult = await api.listMissions(token)
      if (requestId !== loadRequestRef.current) {
        return false
      }
      setMissionLoading(false)

      if (onUnauthorized(missionsResult)) {
        return false
      }

      if (!missionsResult.ok) {
        setStatus({
          type: "error",
          message: getErrorMessage(missionsResult, "Não foi possível carregar tarefas."),
        })
        return false
      }

      setMissions(missionsResult.data)
      setStatus(successMessage ? { type: "success", message: successMessage } : emptyStatus)
      return true
    },
    [onUnauthorized, token]
  )

  const loadFocusBoard = useCallback(
    async (successMessage = "") => {
      if (!token) {
        return
      }

      const requestId = loadRequestRef.current + 1
      loadRequestRef.current = requestId
      setMissionLoading(true)
      const result = await api.getFocusBoard(token)
      if (requestId !== loadRequestRef.current) {
        return false
      }
      setMissionLoading(false)

      if (onUnauthorized(result)) {
        return false
      }

      if (!result.ok) {
        setStatus({
          type: "error",
          message: getErrorMessage(result, "Não foi possível carregar tarefas."),
        })
        return false
      }

      setMissions(result.data.daily_missions)
      setStatus(successMessage ? { type: "success", message: successMessage } : emptyStatus)
      return true
    },
    [onUnauthorized, token]
  )

  useEffect(() => {
    if (!authenticated) {
      setMissions([])
      setStatus(emptyStatus)
      setFormStatus(emptyStatus)
      return
    }

    if (boardMode === "focus") {
      loadFocusBoard()
      return
    }

    loadTasksBoard()
  }, [authenticated, boardMode, loadFocusBoard, loadTasksBoard, token])

  async function reloadCurrentBoard(successMessage = "") {
    return boardMode === "focus" ? loadFocusBoard(successMessage) : loadTasksBoard(successMessage)
  }

  async function refreshAfterPersistedMutation(successMessage) {
    const synchronized = await reloadCurrentBoard()
    if (!synchronized) {
      setStatus({
        type: "error",
        message: `${successMessage} A tarefa foi salva, mas não foi possível atualizar a visão. Recarregue a página.`,
      })
      return { persisted: true, synchronized: false }
    }

    setStatus({ type: "success", message: successMessage })
    return { persisted: true, synchronized: true }
  }

  async function createMission(payload) {
    if (!payload.titulo) {
      setFormStatus({ type: "error", message: "Informe o título da tarefa." })
      return false
    }

    setFormLoading(true)
    setFormStatus(emptyStatus)
    const result = await api.createMission(token, payload)
    setFormLoading(false)

    if (onUnauthorized(result)) {
      return false
    }

    if (!result.ok) {
      setFormStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível registrar a tarefa."),
      })
      return false
    }

    return refreshAfterPersistedMutation("Tarefa registrada.")
  }

  async function updateMission(missionId, payload) {
    if (!payload.titulo) {
      setFormStatus({ type: "error", message: "Informe o título da tarefa." })
      return false
    }

    setFormLoading(true)
    setFormStatus(emptyStatus)
    const result = await api.updateMission(token, missionId, payload)
    setFormLoading(false)

    if (onUnauthorized(result)) {
      return false
    }

    if (!result.ok) {
      setFormStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível salvar a tarefa."),
      })
      return false
    }

    return refreshAfterPersistedMutation("Tarefa atualizada.")
  }

  async function toggleMissionPin(mission) {
    if (!mission?.id) {
      setStatus({ type: "error", message: "Tarefa inválida para subir prioridade." })
      return false
    }

    setPinLoadingId(mission.id)
    setStatus(emptyStatus)
    const result = await api.toggleMissionPin(token, mission.id)
    setPinLoadingId(null)

    if (onUnauthorized(result)) {
      return false
    }

    if (!result.ok) {
      setStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível subir prioridade."),
      })
      await reloadCurrentBoard()
      return false
    }

    return refreshAfterPersistedMutation("Prioridade da tarefa atualizada.")
  }

  async function deleteMission(mission) {
    if (!mission?.id) {
      setStatus({ type: "error", message: "Tarefa inválida para remoção." })
      return false
    }

    setStatus(emptyStatus)
    const result = await api.deleteMission(token, mission.id)

    if (onUnauthorized(result)) {
      return false
    }

    if (!result.ok) {
      setStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível remover a tarefa."),
      })
      return false
    }

    return refreshAfterPersistedMutation("Tarefa removida.")
  }

  async function completeMission(mission) {
    setCompleteLoadingId(mission.id)
    setStatus(emptyStatus)
    const result = await api.completeMission(token, mission.id)
    setCompleteLoadingId(null)

    if (onUnauthorized(result)) {
      return false
    }

    if (!result.ok) {
      setStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível concluir a tarefa."),
      })
      await reloadCurrentBoard()
      return false
    }

    return refreshAfterPersistedMutation("Tarefa concluída.")
  }

  async function reopenMission(mission) {
    if (!mission?.id) {
      setStatus({ type: "error", message: "Tarefa inválida para reabertura." })
      return false
    }

    setReopenLoadingId(mission.id)
    setStatus(emptyStatus)
    const result = await api.updateMission(token, mission.id, { status: "PENDENTE" })
    setReopenLoadingId(null)

    if (onUnauthorized(result)) {
      return false
    }

    if (!result.ok) {
      setStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível reabrir a tarefa."),
      })
      await loadTasksBoard()
      return false
    }

    return refreshAfterPersistedMutation("Tarefa reaberta.")
  }

  async function failMission(missionId) {
    setFailLoadingId(missionId)
    setStatus(emptyStatus)
    const result = await api.failMission(token, missionId)
    setFailLoadingId(null)

    if (onUnauthorized(result)) {
      return { error: "Sessão expirada. Faça login novamente." }
    }

    if (!result.ok) {
      const message = getErrorMessage(result, "Não foi possível registrar a falha.")
      setStatus({ type: "error", message })
      await reloadCurrentBoard()
      return { error: message }
    }

    return refreshAfterPersistedMutation("Falha registrada.")
  }

  return {
    actionMissions,
    completeLoadingId,
    completeMission,
    createMission,
    dailyMissions,
    deleteMission,
    failLoadingId,
    failMission,
    formLoading,
    formStatus,
    missionLoading,
    missions,
    pinLoadingId,
    refreshTasksBoard: loadTasksBoard,
    reopenLoadingId,
    reopenMission,
    setFormStatus,
    setStatus,
    status,
    toggleMissionPin,
    updateMission,
  }
}
