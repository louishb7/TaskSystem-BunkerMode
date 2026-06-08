import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { getErrorMessage } from "../../../api/httpClient.js"
import { emptyStatus } from "../../../constants/uiState.js"
import { api } from "../../../services/bunkermodeApi.js"
import { getActionMissions } from "../missionSelectors.js"

function mergeMissionLists(...missionLists) {
  const missionsById = new Map()

  missionLists.flat().forEach((mission) => {
    if (!mission?.id) {
      return
    }

    missionsById.set(mission.id, mission)
  })

  return Array.from(missionsById.values())
}

export function useMissionBoard({ activeMode, authenticated, onUnauthorized, token }) {
  const [missions, setMissions] = useState([])
  const [reviewMissions, setReviewMissions] = useState([])
  const [historicalMissions, setHistoricalMissions] = useState([])
  const [dailyProgressMissions, setDailyProgressMissions] = useState([])
  const [registeredOutcomeMissions, setRegisteredOutcomeMissions] = useState([])
  const [operationalTurn, setOperationalTurn] = useState(null)
  const [operationalTurnAcknowledged, setOperationalTurnAcknowledged] = useState(false)
  const [reviewState, setReviewState] = useState(null)
  const [weeklyReviews, setWeeklyReviews] = useState([])
  const [operations, setOperations] = useState([])
  const [operationLoading, setOperationLoading] = useState(false)
  const [operationStatus, setOperationStatus] = useState(emptyStatus)
  const [missionLoading, setMissionLoading] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [reviewLoadingId, setReviewLoadingId] = useState(null)
  const [pinLoadingId, setPinLoadingId] = useState(null)
  const [completeLoadingId, setCompleteLoadingId] = useState(null)
  const [reopenLoadingId, setReopenLoadingId] = useState(null)
  const [justificationLoadingId, setJustificationLoadingId] = useState(null)
  const [status, setStatus] = useState(emptyStatus)
  const [formStatus, setFormStatus] = useState(emptyStatus)
  const loadRequestRef = useRef(0)
  const materializingOperationsRef = useRef(new Set())

  const actionMissions = useMemo(() => getActionMissions(missions), [missions])
  const dailyMissions = useMemo(
    () =>
      mergeMissionLists(
        missions,
        dailyProgressMissions,
        reviewMissions,
        historicalMissions,
        registeredOutcomeMissions
      ),
    [dailyProgressMissions, historicalMissions, missions, registeredOutcomeMissions, reviewMissions]
  )

  const loadGeneralSupport = useCallback(
    async (requestId) => {
      const result = await api.getGeneralSupport(token)
      if (requestId !== loadRequestRef.current) {
        return false
      }

      if (onUnauthorized(result)) {
        return false
      }

      if (!result.ok) {
        setReviewMissions([])
        setHistoricalMissions([])
        setReviewState(null)
        setWeeklyReviews([])
        setOperations([])
        setStatus({
          type: "error",
          message: getErrorMessage(
            result,
            "Não foi possível carregar dados de suporte do comando."
          ),
        })
        return false
      }

      setReviewMissions(
        Array.isArray(result.data?.review_missions) ? result.data.review_missions : []
      )
      setHistoricalMissions(
        Array.isArray(result.data?.historical_missions) ? result.data.historical_missions : []
      )
      setReviewState(result.data?.review_state || null)
      setWeeklyReviews(Array.isArray(result.data?.weekly_reviews) ? result.data.weekly_reviews : [])
      setOperations(Array.isArray(result.data?.operations) ? result.data.operations : [])
      return true
    },
    [onUnauthorized, token]
  )

  const refreshMissionsOnly = useCallback(
    async (successMessage = "", requestId = loadRequestRef.current) => {
      if (!token) {
        return false
      }
      const result = await api.listMissions(token)
      if (requestId !== loadRequestRef.current) {
        return false
      }
      if (onUnauthorized(result)) {
        return false
      }
      if (!result.ok) {
        setStatus({
          type: "error",
          message: getErrorMessage(result, "Não foi possível carregar ordens."),
        })
        return false
      }
      setMissions(result.data)
      setStatus(successMessage ? { type: "success", message: successMessage } : emptyStatus)
      return true
    },
    [onUnauthorized, token]
  )

  const loadGeneralBoard = useCallback(
    async (successMessage = "") => {
      if (!token) {
        return
      }

      const requestId = loadRequestRef.current + 1
      loadRequestRef.current = requestId
      setMissionLoading(true)
      setDailyProgressMissions([])
      setRegisteredOutcomeMissions([])
      setOperationalTurn(null)
      setOperationalTurnAcknowledged(false)
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
          message: getErrorMessage(missionsResult, "Não foi possível carregar ordens."),
        })
        return false
      }

      setMissions(missionsResult.data)
      setStatus(successMessage ? { type: "success", message: successMessage } : emptyStatus)
      loadGeneralSupport(requestId)
      return true
    },
    [loadGeneralSupport, onUnauthorized, token]
  )

  const loadSoldierBoard = useCallback(
    async (successMessage = "") => {
      if (!token) {
        return
      }

      const requestId = loadRequestRef.current + 1
      loadRequestRef.current = requestId
      setMissionLoading(true)
      setMissions([])
      setDailyProgressMissions([])
      setReviewMissions([])
      setHistoricalMissions([])
      setRegisteredOutcomeMissions([])
      setReviewState(null)
      setWeeklyReviews([])
      setOperations([])
      setOperationStatus(emptyStatus)
      setOperationalTurn(null)
      const result = await api.getSoldierBoard(token)
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
          message: getErrorMessage(result, "Não foi possível carregar ordens."),
        })
        return false
      }

      setMissions(result.data.missions)
      setDailyProgressMissions(result.data.daily_missions)
      setOperationalTurn(result.data.turn)
      setOperationalTurnAcknowledged((current) => {
        if (!current) {
          return false
        }
        return result.data.turn?.requires_decision === true
      })
      setStatus(successMessage ? { type: "success", message: successMessage } : emptyStatus)
      return true
    },
    [onUnauthorized, token]
  )

  useEffect(() => {
    if (!authenticated) {
      setMissions([])
      setReviewMissions([])
      setHistoricalMissions([])
      setDailyProgressMissions([])
      setRegisteredOutcomeMissions([])
      setOperationalTurn(null)
      setOperationalTurnAcknowledged(false)
      setReviewState(null)
      setWeeklyReviews([])
      setOperations([])
      setOperationStatus(emptyStatus)
      setStatus(emptyStatus)
      setFormStatus(emptyStatus)
      return
    }

    if (activeMode === "soldier") {
      loadSoldierBoard()
      return
    }

    loadGeneralBoard()
  }, [activeMode, authenticated, loadGeneralBoard, loadSoldierBoard, token])

  function continuePreviousOperationalTurn() {
    setOperationalTurnAcknowledged(true)
  }

  async function closePreviousOperationalTurn() {
    if (!token || missionLoading) {
      return false
    }

    setMissionLoading(true)
    setStatus(emptyStatus)
    const result = await api.closePreviousOperationalTurn(token)
    setMissionLoading(false)

    if (onUnauthorized(result)) {
      return false
    }

    if (!result.ok) {
      setStatus({
        type: "error",
        message: getErrorMessage(
          result,
          "Não foi possível encerrar as pendências do ciclo anterior."
        ),
      })
      await loadSoldierBoard()
      return false
    }

    setOperationalTurn(result.data)
    setOperationalTurnAcknowledged(false)
    await loadSoldierBoard("Ciclo anterior encerrado.")
    return true
  }

  const materializeOperations = useCallback(
    async (payload) => {
      if (!token) {
        return false
      }
      const key = `${payload?.start_date || ""}:${payload?.end_date || ""}`
      if (materializingOperationsRef.current.has(key)) {
        return true
      }

      materializingOperationsRef.current.add(key)
      const requestId = loadRequestRef.current
      try {
        const result = await api.materializeOperations(token, payload)
        if (requestId !== loadRequestRef.current) {
          return false
        }
        if (onUnauthorized(result)) {
          return false
        }
        if (!result.ok) {
          setStatus({
            type: "error",
            message: getErrorMessage(result, "Não foi possível preparar as ordens da operação."),
          })
          return false
        }
        const generated = Number(result.data?.generated || 0)
        if (generated > 0) {
          await refreshMissionsOnly("", requestId)
        }
        return true
      } finally {
        materializingOperationsRef.current.delete(key)
      }
    },
    [onUnauthorized, refreshMissionsOnly, token]
  )

  async function createOperation(payload) {
    if (operationLoading) {
      return false
    }
    setOperationLoading(true)
    setOperationStatus(emptyStatus)
    const result = await api.createOperation(token, payload)
    setOperationLoading(false)

    if (onUnauthorized(result)) {
      return false
    }

    if (!result.ok) {
      setOperationStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível registrar a operação."),
      })
      return false
    }

    await loadGeneralBoard("Operação registrada.")
    setOperationStatus({ type: "success", message: "Operação registrada." })
    return true
  }

  async function closeOperation(operationId) {
    if (operationLoading) {
      return false
    }
    setOperationLoading(true)
    setOperationStatus(emptyStatus)
    const result = await api.closeOperation(token, operationId)
    setOperationLoading(false)

    if (onUnauthorized(result)) {
      return false
    }

    if (!result.ok) {
      setOperationStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível encerrar a operação."),
      })
      return false
    }

    await loadGeneralBoard("Operação encerrada.")
    setOperationStatus({ type: "success", message: "Operação encerrada." })
    return true
  }

  async function deleteOperation(operationId) {
    if (operationLoading) {
      return false
    }
    setOperationLoading(true)
    setOperationStatus(emptyStatus)
    const result = await api.deleteOperation(token, operationId)
    setOperationLoading(false)

    if (onUnauthorized(result)) {
      return false
    }

    if (!result.ok) {
      setOperationStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível cancelar a operação."),
      })
      return false
    }

    await loadGeneralBoard("Operação cancelada.")
    setOperationStatus({ type: "success", message: "Operação cancelada." })
    return true
  }

  async function createMission(payload) {
    if (!payload.titulo) {
      setFormStatus({ type: "error", message: "Informe o título da ordem." })
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
        message: getErrorMessage(result, "Não foi possível registrar a ordem."),
      })
      return false
    }

    await loadGeneralBoard("Ordem registrada.")
    return true
  }

  async function updateMission(missionId, payload) {
    if (!payload.titulo) {
      setFormStatus({ type: "error", message: "Informe o título da ordem." })
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
        message: getErrorMessage(result, "Não foi possível salvar a ordem."),
      })
      return false
    }

    await loadGeneralBoard("Ordem atualizada.")
    return true
  }

  async function toggleMissionPin(mission) {
    if (!mission?.id) {
      setStatus({ type: "error", message: "Ordem inválida para subir prioridade." })
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
      if (activeMode === "soldier") {
        await loadSoldierBoard()
      } else {
        await loadGeneralBoard()
      }
      return false
    }

    if (activeMode === "soldier") {
      await loadSoldierBoard()
    } else {
      await loadGeneralBoard()
    }
    return true
  }

  async function deleteMission(mission) {
    if (!mission?.id) {
      setStatus({ type: "error", message: "Ordem inválida para remoção." })
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
        message: getErrorMessage(result, "Não foi possível remover a ordem."),
      })
      return false
    }

    await loadGeneralBoard("Ordem removida.")
    return true
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
        message: getErrorMessage(result, "Não foi possível concluir a ordem."),
      })
      if (activeMode === "soldier") {
        await loadSoldierBoard()
      } else {
        await loadGeneralBoard()
      }
      return false
    }

    if (activeMode === "soldier") {
      await loadSoldierBoard("LEÃO ABATIDO")
    } else {
      await loadGeneralBoard("Ordem executada.")
    }
    setRegisteredOutcomeMissions((current) => mergeMissionLists(current, [result.data]))
    return true
  }

  async function reopenMission(mission) {
    if (!mission?.id) {
      setStatus({ type: "error", message: "Ordem inválida para reabertura." })
      return false
    }

    setReopenLoadingId(mission.id)
    setStatus(emptyStatus)
    const result = await api.updateMission(token, mission.id, { status: "Pendente" })
    setReopenLoadingId(null)

    if (onUnauthorized(result)) {
      return false
    }

    if (!result.ok) {
      setStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível reabrir a ordem."),
      })
      await loadGeneralBoard()
      return false
    }

    await loadGeneralBoard("Ordem reaberta.")
    return true
  }

  async function submitFailureJustification(missionId, payload) {
    setJustificationLoadingId(missionId)
    setStatus(emptyStatus)
    const result = await api.submitFailureJustification(token, missionId, payload)
    setJustificationLoadingId(null)

    if (onUnauthorized(result)) {
      return { error: "Sessão expirada. Faça login novamente." }
    }

    if (!result.ok) {
      const message = getErrorMessage(result, "Não foi possível registrar a falha.")
      setStatus({ type: "error", message })
      if (activeMode === "soldier") {
        await loadSoldierBoard()
      } else {
        await loadGeneralBoard()
      }
      return { error: message }
    }

    if (activeMode === "soldier") {
      await loadSoldierBoard("FALHA REGISTRADA")
    } else {
      await loadGeneralBoard("Falha registrada.")
    }
    setRegisteredOutcomeMissions((current) => mergeMissionLists(current, [result.data]))
    return { ok: true }
  }

  async function submitGeneralReview(missionId, accepted) {
    setReviewLoadingId(missionId)
    setStatus(emptyStatus)
    const result = await api.submitGeneralReview(token, missionId, { accepted })
    setReviewLoadingId(null)

    if (onUnauthorized(result)) {
      return false
    }

    if (!result.ok) {
      setStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível revisar a falha."),
      })
      return false
    }

    await loadGeneralBoard()
    return true
  }

  async function clearFailureReport(payload) {
    setStatus(emptyStatus)
    const result = await api.clearFailureReport(token, payload)

    if (onUnauthorized(result)) {
      return false
    }

    if (!result.ok) {
      setStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível limpar o relatório de falhas."),
      })
      await loadGeneralBoard()
      return false
    }

    await loadGeneralBoard("Relatório de falhas limpo.")
    return true
  }

  async function closeWeeklyReview(payload) {
    setStatus(emptyStatus)
    const result = await api.closeWeeklyReview(token, payload)

    if (onUnauthorized(result)) {
      return false
    }

    if (!result.ok) {
      setStatus({
        type: "error",
        message: getErrorMessage(result, "Não foi possível fechar a revisão do General."),
      })
      await loadGeneralBoard()
      return false
    }

    await loadGeneralBoard("Revisão do General fechada.")
    return true
  }

  return {
    actionMissions,
    clearFailureReport,
    closeWeeklyReview,
    closeOperation,
    closePreviousOperationalTurn,
    completeLoadingId,
    completeMission,
    createOperation,
    createMission,
    continuePreviousOperationalTurn,
    dailyMissions,
    deleteOperation,
    deleteMission,
    formLoading,
    formStatus,
    hasRegisteredOutcomes: registeredOutcomeMissions.length > 0,
    justificationLoadingId,
    missionLoading,
    missions,
    materializeOperations,
    operationLoading,
    operationStatus,
    operationalTurn,
    operationalTurnAcknowledged,
    operations,
    pinLoadingId,
    refreshGeneralBoard: loadGeneralBoard,
    reopenLoadingId,
    reopenMission,
    reviewLoadingId,
    reviewMissions,
    reviewState,
    setFormStatus,
    setStatus,
    status,
    submitFailureJustification,
    submitGeneralReview,
    toggleMissionPin,
    updateMission,
    weeklyReviews,
  }
}
