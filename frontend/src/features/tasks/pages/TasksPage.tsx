import React, { useMemo, useState } from "react"

import ConfirmDialog from "../../../components/ui/ConfirmDialog"
import Button from "../../../components/ui/Button"
import Dialog from "../../../components/ui/Dialog"
import PageHeader from "../../../components/ui/PageHeader"
import StatusNotice from "../../../components/ui/StatusNotice"
import { emptyStatus } from "../../../constants/uiState"
import { formatDateForApi } from "../../../utils/date"
import TaskForm from "../components/TaskForm"
import {
  addDays,
  formatWeekLabel,
  getWeekDays,
  normalizeTaskDate,
  operationalDateFor,
  startOfDay,
} from "../../calendar/calendarUtils"
import StartFocusDialog from "../components/StartFocusDialog"
import TasksPanel from "../components/TasksPanel"
import WeekPanel from "../components/WeekPanel"

export default function TasksPage({ board, onStartFocus, onUnauthorized, token, user }) {
  const [selectedDate, setSelectedDate] = useState(() => operationalDateFor(user?.timezone))
  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [showFocusConfirm, setShowFocusConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [modeLoading, setModeLoading] = useState(false)

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate])
  const weekLabel = formatWeekLabel(weekDays)
  const todayDate = useMemo(() => operationalDateFor(user?.timezone), [user?.timezone])
  const selectedDateApi = formatDateForApi(selectedDate)
  const selectedTasks = useMemo(
    () => board.dailyTasks.filter((task) => normalizeTaskDate(task?.prazo) === selectedDateApi),
    [board.dailyTasks, selectedDateApi]
  )
  const todayTasks = useMemo(
    () =>
      board.dailyTasks.filter(
        (task) => normalizeTaskDate(task?.prazo) === formatDateForApi(todayDate)
      ),
    [board.dailyTasks, todayDate]
  )
  function openCreateForm() {
    setEditingTask(null)
    board.setFormStatus(emptyStatus)
    setFormOpen(true)
  }

  function openEditForm(task) {
    setEditingTask(task)
    board.setFormStatus(emptyStatus)
    setFormOpen(true)
  }

  async function createTask(payload) {
    const saved = await board.createTask(payload)
    if (saved?.persisted) {
      setFormOpen(false)
      setEditingTask(null)
    }
  }

  async function updateTask(taskId, payload) {
    const saved = await board.updateTask(taskId, payload)
    if (saved?.persisted) {
      setFormOpen(false)
      setEditingTask(null)
    }
  }

  async function deleteTask(task) {
    const removed = await board.deleteTask(task)
    if (removed?.persisted && editingTask?.id === task.id) {
      setEditingTask(null)
      setFormOpen(false)
    }
  }

  async function confirmStartFocus() {
    setModeLoading(true)
    const started = await onStartFocus()
    setModeLoading(false)
    if (started) {
      setShowFocusConfirm(false)
      setFormOpen(false)
      setEditingTask(null)
    }
  }

  return (
    <>
      <section className="grid gap-8">
        <PageHeader
          actions={
            <Button loading={modeLoading} onClick={() => setShowFocusConfirm(true)}>
              Iniciar foco
            </Button>
          }
          description="Planeje e organize suas tarefas."
          title="Tarefas"
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

        <TasksPanel
          completeLoadingId={board.completeLoadingId}
          failLoadingId={board.failLoadingId}
          loading={board.taskLoading}
          onCompleteTask={board.completeTask}
          onCreateTask={openCreateForm}
          onDeleteTask={setDeleteTarget}
          onEditTask={openEditForm}
          onFailTask={board.failTask}
          onReopenTask={board.reopenTask}
          onTogglePin={board.toggleTaskPin}
          pinLoadingId={board.pinLoadingId}
          reopenLoadingId={board.reopenLoadingId}
          selectedDate={selectedDate}
          selectedTasks={selectedTasks}
          timezone={user?.timezone}
        />
      </section>

      {formOpen && (
        <Dialog
          className="max-w-2xl"
          closeOnBackdrop={false}
          onClose={() => {
            setFormOpen(false)
            setEditingTask(null)
            board.setFormStatus(emptyStatus)
          }}
          title={editingTask ? "Editar tarefa" : "Nova tarefa"}
        >
          <TaskForm
            currentUser={user}
            editingTask={editingTask}
            initialPrazo={editingTask ? undefined : selectedDateApi}
            loading={board.formLoading}
            onUnauthorized={onUnauthorized}
            onCancel={() => {
              setFormOpen(false)
              setEditingTask(null)
              board.setFormStatus(emptyStatus)
            }}
            onCreate={createTask}
            onUpdate={updateTask}
            status={board.formStatus}
            token={token}
            timezone={user?.timezone}
          />
        </Dialog>
      )}

      {showFocusConfirm && (
        <StartFocusDialog
          loading={modeLoading}
          onCancel={() => setShowFocusConfirm(false)}
          onConfirm={confirmStartFocus}
          todayTasks={todayTasks}
          timezone={user?.timezone}
        />
      )}

      {deleteTarget !== null && (
        <ConfirmDialog
          title="Remover tarefa"
          message={`"${deleteTarget?.titulo}" será removida das tarefas.`}
          confirmLabel="Remover"
          variant="danger"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            deleteTask(deleteTarget)
            setDeleteTarget(null)
          }}
        />
      )}
    </>
  )
}
