import React, { useMemo, useState } from "react"

import ConfirmDialog from "../../../components/ui/ConfirmDialog"
import StatusNotice from "../../../components/ui/StatusNotice"
import TacticalShell from "../../../components/tactical/TacticalShell"
import { emptyStatus } from "../../../constants/uiState"
import { formatDateForApi } from "../../../utils/date"
import { isCompleted } from "../../../utils/missionStatus"
import MissionForm from "../../missions/components/MissionForm"
import {
  addDays,
  formatSelectedDate,
  formatWeekLabel,
  getWeekDays,
  normalizeMissionDate,
  startOfDay,
} from "../../calendar/calendarUtils"
import ActivateSoldierDialog from "../components/ActivateSoldierDialog"
import OrdersPanel from "../components/OrdersPanel"
import WeekPanel from "../components/WeekPanel"

export default function GeneralCommandPage({
  board,
  generalName,
  onActivateSoldier,
  onLogout,
  onOpenObjectives,
  onUnauthorized,
  token,
  user,
}) {
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()))
  const [formOpen, setFormOpen] = useState(false)
  const [editingMission, setEditingMission] = useState(null)
  const [showSoldierConfirm, setShowSoldierConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [modeLoading, setModeLoading] = useState(false)

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate])
  const weekLabel = formatWeekLabel(weekDays)
  const todayDate = useMemo(() => startOfDay(new Date()), [])
  const selectedDateApi = formatDateForApi(selectedDate)
  const selectedDateLabel = formatSelectedDate(selectedDate)
  const missionStatsByDate = useMemo(
    () =>
      board.dailyMissions.reduce((stats, mission) => {
        const key = normalizeMissionDate(mission?.prazo)
        if (!key) {
          return stats
        }

        const current = stats[key] || { completed: 0, total: 0 }
        stats[key] = {
          completed: current.completed + (isCompleted(mission) ? 1 : 0),
          total: current.total + 1,
        }
        return stats
      }, {}),
    [board.dailyMissions]
  )
  const selectedMissions = useMemo(
    () =>
      board.dailyMissions.filter(
        (mission) => normalizeMissionDate(mission?.prazo) === selectedDateApi
      ),
    [board.dailyMissions, selectedDateApi]
  )
  const todayMissions = useMemo(
    () =>
      board.dailyMissions.filter(
        (mission) => normalizeMissionDate(mission?.prazo) === formatDateForApi(todayDate)
      ),
    [board.dailyMissions, todayDate]
  )
  function openCreateForm() {
    setEditingMission(null)
    board.setFormStatus(emptyStatus)
    setFormOpen(true)
  }

  function openEditForm(mission) {
    setEditingMission(mission)
    board.setFormStatus(emptyStatus)
    setFormOpen(true)
  }

  async function createMission(payload) {
    const saved = await board.createMission(payload)
    if (saved?.persisted) {
      setFormOpen(false)
      setEditingMission(null)
    }
  }

  async function updateMission(missionId, payload) {
    const saved = await board.updateMission(missionId, payload)
    if (saved?.persisted) {
      setFormOpen(false)
      setEditingMission(null)
    }
  }

  async function deleteMission(mission) {
    const removed = await board.deleteMission(mission)
    if (removed?.persisted && editingMission?.id === mission.id) {
      setEditingMission(null)
      setFormOpen(false)
    }
  }

  async function confirmActivateSoldier() {
    setModeLoading(true)
    const activated = await onActivateSoldier()
    setModeLoading(false)
    if (activated) {
      setShowSoldierConfirm(false)
      setFormOpen(false)
      setEditingMission(null)
    }
  }

  return (
    <TacticalShell mode="general">
      <section className="general-layout">
        <section className="general-board">
          <header className="app-header general-command-header">
            <div>
              <p className="panel-kicker">GENERAL</p>
              <h1>Comando operacional</h1>
              <p className="muted">
                {generalName} / {selectedDateLabel}
              </p>
            </div>
            <div className="header-actions">
              <button className="button secondary compact" type="button" onClick={onOpenObjectives}>
                OBJETIVOS
              </button>
              <button
                className="button fire compact"
                disabled={modeLoading}
                type="button"
                onClick={() => setShowSoldierConfirm(true)}
              >
                {modeLoading ? "ATIVANDO" : "MODO SOLDADO"}
              </button>
              <button className="button secondary compact" type="button" onClick={onLogout}>
                SAIR
              </button>
            </div>
          </header>

          <WeekPanel
            missionStatsByDate={missionStatsByDate}
            onNextWeek={() => setSelectedDate((current) => addDays(current, 7))}
            onPreviousWeek={() => setSelectedDate((current) => addDays(current, -7))}
            onSelectDate={(date) => setSelectedDate(startOfDay(date))}
            selectedDate={selectedDate}
            todayDate={todayDate}
            weekLabel={weekLabel}
            weekDays={weekDays}
          />

          <StatusNotice status={board.status} />

          <OrdersPanel
            completeLoadingId={board.completeLoadingId}
            failLoadingId={board.failLoadingId}
            loading={board.missionLoading}
            onCompleteMission={board.completeMission}
            onCreateOrder={openCreateForm}
            onDeleteMission={setDeleteTarget}
            onEditMission={openEditForm}
            onFailMission={board.failMission}
            onReopenMission={board.reopenMission}
            onTogglePin={board.toggleMissionPin}
            pinLoadingId={board.pinLoadingId}
            reopenLoadingId={board.reopenLoadingId}
            selectedMissions={selectedMissions}
          />
        </section>
      </section>

      {formOpen && (
        <div className="modal-backdrop command-modal-backdrop" role="presentation">
          <div
            className="command-modal-card order-modal-card"
            role="dialog"
            aria-modal="true"
            aria-label={editingMission ? "Editar ordem" : "Nova ordem"}
          >
            <MissionForm
              currentUser={user}
              editingMission={editingMission}
              initialPrazo={editingMission ? undefined : selectedDateApi}
              loading={board.formLoading}
              onUnauthorized={onUnauthorized}
              onCancel={() => {
                setFormOpen(false)
                setEditingMission(null)
                board.setFormStatus(emptyStatus)
              }}
              onCreate={createMission}
              onUpdate={updateMission}
              status={board.formStatus}
              token={token}
            />
          </div>
        </div>
      )}

      {showSoldierConfirm && (
        <ActivateSoldierDialog
          loading={modeLoading}
          onCancel={() => setShowSoldierConfirm(false)}
          onConfirm={confirmActivateSoldier}
          todayMissions={todayMissions}
        />
      )}

      {deleteTarget !== null && (
        <ConfirmDialog
          title="Remover ordem"
          message={`"${deleteTarget?.titulo}" será removida do quadro.`}
          confirmLabel="REMOVER"
          variant="danger"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            deleteMission(deleteTarget)
            setDeleteTarget(null)
          }}
        />
      )}
    </TacticalShell>
  )
}
