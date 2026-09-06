import React, { useMemo, useState } from "react"

import ConfirmDialog from "../../../components/ui/ConfirmDialog"
import Button from "../../../components/ui/Button"
import Dialog from "../../../components/ui/Dialog"
import PageHeader from "../../../components/ui/PageHeader"
import StatusNotice from "../../../components/ui/StatusNotice"
import { emptyStatus } from "../../../constants/uiState"
import { formatDateForApi } from "../../../utils/date"
import MissionForm from "../../missions/components/MissionForm"
import {
  addDays,
  formatWeekLabel,
  getWeekDays,
  normalizeMissionDate,
  operationalDateFor,
  startOfDay,
} from "../../calendar/calendarUtils"
import ActivateSoldierDialog from "../components/ActivateSoldierDialog"
import OrdersPanel from "../components/OrdersPanel"
import WeekPanel from "../components/WeekPanel"

export default function GeneralCommandPage({
  board,
  onActivateSoldier,
  onUnauthorized,
  token,
  user,
}) {
  const [selectedDate, setSelectedDate] = useState(() => operationalDateFor(user?.timezone))
  const [formOpen, setFormOpen] = useState(false)
  const [editingMission, setEditingMission] = useState(null)
  const [showSoldierConfirm, setShowSoldierConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [modeLoading, setModeLoading] = useState(false)

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate])
  const weekLabel = formatWeekLabel(weekDays)
  const todayDate = useMemo(() => operationalDateFor(user?.timezone), [user?.timezone])
  const selectedDateApi = formatDateForApi(selectedDate)
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
    <>
      <section className="grid gap-8">
        <PageHeader
          actions={
            <Button loading={modeLoading} onClick={() => setShowSoldierConfirm(true)}>
              Entrar no Soldado
            </Button>
          }
          description="Planeje e organize suas ordens."
          title="Início"
        />

        <WeekPanel
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
          selectedDate={selectedDate}
          selectedMissions={selectedMissions}
          timezone={user?.timezone}
        />
      </section>

      {formOpen && (
        <Dialog
          className="max-w-2xl"
          closeOnBackdrop={false}
          onClose={() => {
            setFormOpen(false)
            setEditingMission(null)
            board.setFormStatus(emptyStatus)
          }}
          title={editingMission ? "Editar ordem" : "Nova ordem"}
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
            timezone={user?.timezone}
          />
        </Dialog>
      )}

      {showSoldierConfirm && (
        <ActivateSoldierDialog
          loading={modeLoading}
          onCancel={() => setShowSoldierConfirm(false)}
          onConfirm={confirmActivateSoldier}
          todayMissions={todayMissions}
          timezone={user?.timezone}
        />
      )}

      {deleteTarget !== null && (
        <ConfirmDialog
          title="Remover ordem"
          message={`"${deleteTarget?.titulo}" será removida do quadro.`}
          confirmLabel="Remover"
          variant="danger"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            deleteMission(deleteTarget)
            setDeleteTarget(null)
          }}
        />
      )}
    </>
  )
}
