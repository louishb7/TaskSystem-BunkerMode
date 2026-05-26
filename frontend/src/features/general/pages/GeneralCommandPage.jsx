import React, { useEffect, useMemo, useState } from "react";

import ConfirmDialog from "../../../components/ui/ConfirmDialog.jsx";
import StatusNotice from "../../../components/ui/StatusNotice.jsx";
import TacticalShell from "../../../components/tactical/TacticalShell.jsx";
import { emptyStatus } from "../../../constants/uiState.js";
import { formatDateForApi } from "../../../utils/date.js";
import { isCompleted } from "../../../utils/missionStatus.js";
import MissionForm from "../../missions/components/MissionForm.jsx";
import {
  addDays,
  formatSelectedDate,
  formatWeekLabel,
  getWeekDays,
  normalizeMissionDate,
  startOfDay,
} from "../../calendar/calendarUtils.js";
import ActivateSoldierDialog from "../components/ActivateSoldierDialog.jsx";
import CommandRail from "../components/CommandRail.jsx";
import OrdersPanel from "../components/OrdersPanel.jsx";
import TacticalSidePanel from "../components/TacticalSidePanel.jsx";
import WeekPanel from "../components/WeekPanel.jsx";
import OperationsPanel from "../../operations/components/OperationsPanel.jsx";

export default function GeneralCommandPage({
  board,
  generalName,
  onActivateSoldier,
  onLogout,
  onOpenMountain,
  onOpenReview,
  onUnauthorized,
  token,
  user,
}) {
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [formOpen, setFormOpen] = useState(false);
  const [editingMission, setEditingMission] = useState(null);
  const [operationsOpen, setOperationsOpen] = useState(false);
  const [showSoldierConfirm, setShowSoldierConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [modeLoading, setModeLoading] = useState(false);

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const weekLabel = formatWeekLabel(weekDays);
  const todayDate = useMemo(() => startOfDay(new Date()), []);
  const selectedDateApi = formatDateForApi(selectedDate);
  const selectedDateLabel = formatSelectedDate(selectedDate);
  const missionStatsByDate = useMemo(
    () => board.dailyMissions.reduce((stats, mission) => {
      const key = normalizeMissionDate(mission?.prazo);
      if (!key) {
        return stats;
      }

      const current = stats[key] || { completed: 0, total: 0 };
      stats[key] = {
        completed: current.completed + (isCompleted(mission) ? 1 : 0),
        total: current.total + 1,
      };
      return stats;
    }, {}),
    [board.dailyMissions]
  );
  const selectedMissions = useMemo(
    () => board.dailyMissions.filter((mission) => normalizeMissionDate(mission?.prazo) === selectedDateApi),
    [board.dailyMissions, selectedDateApi]
  );
  const todayMissions = useMemo(
    () => board.dailyMissions.filter((mission) => normalizeMissionDate(mission?.prazo) === formatDateForApi(todayDate)),
    [board.dailyMissions, todayDate]
  );
  const selectedCompleted = selectedMissions.filter(isCompleted).length;
  const selectedFailures = selectedMissions.filter((mission) => String(mission?.status_code || "").startsWith("FALHA")).length;
  const selectedHighPriority = selectedMissions.filter((mission) => mission?.is_pinned === true).length;
  const selectedPending = Math.max(0, selectedMissions.length - selectedCompleted - selectedFailures);
  const reviewCount = board.reviewMissions.length + (board.reviewState?.pending ? 1 : 0);

  useEffect(() => {
    const start = formatDateForApi(weekDays[0]);
    const end = formatDateForApi(weekDays[weekDays.length - 1]);
    board.materializeOperations?.({ start_date: start, end_date: end });
  }, [weekDays]);

  function openCreateForm() {
    setEditingMission(null);
    board.setFormStatus(emptyStatus);
    setFormOpen(true);
  }

  function openEditForm(mission) {
    setEditingMission(mission);
    board.setFormStatus(emptyStatus);
    setFormOpen(true);
  }

  async function createMission(payload) {
    const saved = await board.createMission(payload);
    if (saved) {
      setFormOpen(false);
      setEditingMission(null);
    }
  }

  async function updateMission(missionId, payload) {
    const saved = await board.updateMission(missionId, payload);
    if (saved) {
      setFormOpen(false);
      setEditingMission(null);
    }
  }

  async function deleteMission(mission) {
    const removed = await board.deleteMission(mission);
    if (removed && editingMission?.id === mission.id) {
      setEditingMission(null);
      setFormOpen(false);
    }
  }

  async function confirmActivateSoldier() {
    setModeLoading(true);
    const activated = await onActivateSoldier();
    setModeLoading(false);
    if (activated) {
      setShowSoldierConfirm(false);
      setFormOpen(false);
      setEditingMission(null);
    }
  }

  return (
    <TacticalShell mode="general">
      <section className="general-layout">
        <aside className="general-side command-side">
          <CommandRail
            generalName={generalName}
            onLogout={onLogout}
            onOpenMountain={onOpenMountain}
            onOpenOperations={() => setOperationsOpen(true)}
            onOpenReview={onOpenReview}
            reviewCount={reviewCount}
          />
        </aside>

        <section className="general-board">
          <header className="app-header general-command-header">
            <div>
              <p className="panel-kicker">SALA DE GUERRA</p>
              <h1>Comando operacional</h1>
              <p className="muted">{generalName} / {selectedDateLabel}</p>
            </div>
            <div className="header-actions">
              <button className="button secondary compact" type="button" onClick={onOpenReview}>
                RELATÓRIO
              </button>
              <button
                className="button fire compact"
                disabled={modeLoading}
                type="button"
                onClick={() => setShowSoldierConfirm(true)}
              >
                {modeLoading ? "ATIVANDO" : "MODO SOLDADO"}
              </button>
            </div>
          </header>

          <div className="metric-grid" aria-label="Resumo operacional do dia">
            <div className="metric-card">
              <span>ORDENS DO DIA</span>
              <strong>{selectedMissions.length}</strong>
            </div>
            <div className="metric-card success">
              <span>CUMPRIDAS</span>
              <strong>{selectedCompleted}</strong>
            </div>
            <div className="metric-card">
              <span>PENDENTES</span>
              <strong>{selectedPending}</strong>
            </div>
            <div className="metric-card priority">
              <span>PRIORIDADE</span>
              <strong>{selectedHighPriority}</strong>
            </div>
          </div>

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
            justificationLoadingId={board.justificationLoadingId}
            loading={board.missionLoading}
            onCompleteMission={board.completeMission}
            onCreateOrder={openCreateForm}
            onDeleteMission={setDeleteTarget}
            onEditMission={openEditForm}
            onJustifyMission={board.submitFailureJustification}
            onReopenMission={board.reopenMission}
            onTogglePin={board.toggleMissionPin}
            pinLoadingId={board.pinLoadingId}
            reopenLoadingId={board.reopenLoadingId}
            selectedMissions={selectedMissions}
          />
        </section>

        <aside className="general-side operational-side">
          <TacticalSidePanel
            loading={modeLoading}
            onActivateSoldier={() => setShowSoldierConfirm(true)}
            reviewCount={reviewCount}
            selectedDate={selectedDate}
            selectedDateLabel={selectedDateLabel}
            selectedMissions={selectedMissions}
            todayDate={todayDate}
          />
        </aside>
      </section>

      {formOpen && (
        <div className="modal-backdrop command-modal-backdrop" role="presentation">
          <div className="command-modal-card order-modal-card" role="dialog" aria-modal="true" aria-label={editingMission ? "Editar ordem" : "Nova ordem"}>
            <MissionForm
              currentUser={user}
              editingMission={editingMission}
              initialPrazo={editingMission ? undefined : selectedDateApi}
              loading={board.formLoading}
              onUnauthorized={onUnauthorized}
              onCancel={() => {
                setFormOpen(false);
                setEditingMission(null);
                board.setFormStatus(emptyStatus);
              }}
              onCreate={createMission}
              onUpdate={updateMission}
              status={board.formStatus}
              token={token}
            />
          </div>
        </div>
      )}

      {operationsOpen && (
        <div className="modal-backdrop command-modal-backdrop" role="presentation">
          <div className="command-modal-card operations-modal-card" role="dialog" aria-modal="true" aria-label="Operações">
            <OperationsPanel
              loading={board.operationLoading}
              onClose={() => setOperationsOpen(false)}
              onCloseOperation={board.closeOperation}
              onCreateOperation={board.createOperation}
              onDeleteOperation={board.deleteOperation}
              operations={board.operations}
              status={board.operationStatus}
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
            deleteMission(deleteTarget);
            setDeleteTarget(null);
          }}
        />
      )}
    </TacticalShell>
  );
}
