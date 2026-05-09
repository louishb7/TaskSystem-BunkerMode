import React, { useMemo, useState } from "react";

import StatusNotice from "../../../components/ui/StatusNotice.jsx";
import TacticalShell from "../../../components/tactical/TacticalShell.jsx";
import { emptyStatus } from "../../../constants/uiState.js";
import { formatDateForApi } from "../../../utils/date.js";
import { isCompleted } from "../../../utils/missionStatus.js";
import { countCompletedMissions } from "../../missions/missionSelectors.js";
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

export default function GeneralCommandPage({
  board,
  generalName,
  onActivateSoldier,
  onLogout,
  onOpenReview,
  user,
}) {
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [formOpen, setFormOpen] = useState(false);
  const [editingMission, setEditingMission] = useState(null);
  const [showSoldierConfirm, setShowSoldierConfirm] = useState(false);
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
  const completedCount = countCompletedMissions(selectedMissions);
  const remainingCount = Math.max(0, selectedMissions.length - completedCount);

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
    const confirmed = window.confirm("Remover esta ordem do quadro?");
    if (!confirmed) {
      return;
    }

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
        <CommandRail
          generalName={generalName}
          loadingSoldier={modeLoading}
          onActivateSoldier={() => setShowSoldierConfirm(true)}
          onCreateOrder={openCreateForm}
          onLogout={onLogout}
          onOpenReview={onOpenReview}
          reviewCount={board.reviewMissions.length}
          weekLabel={weekLabel}
        />

        <section className="general-board">
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
            decisionLoadingId={board.decisionLoadingId}
            loading={board.missionLoading}
            onCreateOrder={openCreateForm}
            onDeleteMission={deleteMission}
            onEditMission={openEditForm}
            onToggleDecision={board.toggleMissionDecision}
            selectedMissions={selectedMissions}
          />
        </section>

        <aside className="general-side">
          {formOpen && (
            <MissionForm
              currentUser={user}
              editingMission={editingMission}
              initialPrazo={editingMission ? undefined : selectedDateApi}
              loading={board.formLoading}
              onCancel={() => {
                setFormOpen(false);
                setEditingMission(null);
                board.setFormStatus(emptyStatus);
              }}
              onCreate={createMission}
              onUpdate={updateMission}
              status={board.formStatus}
            />
          )}
          <TacticalSidePanel
            remainingCount={remainingCount}
            selectedDateLabel={selectedDateLabel}
            selectedMissions={selectedMissions}
          />
        </aside>
      </section>

      {showSoldierConfirm && (
        <ActivateSoldierDialog
          loading={modeLoading}
          onCancel={() => setShowSoldierConfirm(false)}
          onConfirm={confirmActivateSoldier}
        />
      )}
    </TacticalShell>
  );
}
