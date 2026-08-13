import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { getErrorMessage } from "../../../api/httpClient"
import { emptyStatus } from "../../../constants/uiState"
import { api } from "../../../services/bunkermodeApi"
import { getActionMissions } from "../missionSelectors"

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
  const [reviewState, setReviewState] = useState(null)
  const [weeklyReviews, setWeeklyReviews] = useState([])
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
      setReviewState(null)
      setWeeklyReviews([])
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

  async function reloadCurrentBoard(successMessage = "") {
    return activeMode === "soldier"
      ? loadSoldierBoard(successMessage)
      : loadGeneralBoard(successMessage)
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
      await reloadCurrentBoard()
      return false
    }

    await reloadCurrentBoard()
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
      await reloadCurrentBoard()
      return false
    }

    await reloadCurrentBoard(activeMode === "soldier" ? "LEÃO ABATIDO" : "Ordem executada.")
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
    const result = await api.updateMission(token, mission.id, { status: "PENDENTE" })
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

    await reloadCurrentBoard(activeMode === "soldier" ? "FALHA REGISTRADA" : "Falha registrada.")
    setRegisteredOutcomeMissions((current) => mergeMissionLists(current, [result.data]))
    return { ok: true }
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
    closeWeeklyReview,
    completeLoadingId,
    completeMission,
    createMission,
    dailyMissions,
    deleteMission,
    failLoadingId,
    failMission,
    formLoading,
    formStatus,
    hasRegisteredOutcomes: registeredOutcomeMissions.length > 0,
    missionLoading,
    missions,
    pinLoadingId,
    refreshGeneralBoard: loadGeneralBoard,
    reopenLoadingId,
    reopenMission,
    reviewMissions,
    reviewState,
    setFormStatus,
    setStatus,
    status,
    toggleMissionPin,
    updateMission,
    weeklyReviews,
  }
}
