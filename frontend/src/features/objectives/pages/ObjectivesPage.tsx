import React, { useState } from "react"

import ConfirmDialog from "../../../components/ui/ConfirmDialog"
import Button from "../../../components/ui/Button"
import Dialog from "../../../components/ui/Dialog"
import PageHeader from "../../../components/ui/PageHeader"
import StatusNotice from "../../../components/ui/StatusNotice"
import { emptyStatus } from "../../../constants/uiState"
import TaskForm from "../../tasks/components/TaskForm"
import ObjetivoForm from "../components/ObjetivoForm"
import ObjetivoList from "../components/ObjetivoList"
import { useObjectives } from "../hooks/useObjectives"

export default function ObjectivesPage({ board, onUnauthorized, token, user }) {
  const objectives = useObjectives({ onUnauthorized, token })
  const [editingObjetivo, setEditingObjetivo] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [taskObjetivo, setTaskObjetivo] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const busy = objectives.loading || objectives.mutating

  function closeObjectiveForm() {
    setFormOpen(false)
    setEditingObjetivo(null)
  }

  async function submitObjetivo(payload) {
    const saved = editingObjetivo
      ? await objectives.updateObjetivo(editingObjetivo.id, payload)
      : await objectives.createObjetivo(payload)
    if (saved) {
      closeObjectiveForm()
    }
  }

  async function createTask(payload) {
    const saved = await board.createTask(payload)
    if (saved) {
      setTaskObjetivo(null)
      await objectives.refresh()
    }
  }

  function moveObjetivoToTop(objetivoId) {
    const reordered = [...objectives.objetivos]
    const index = reordered.findIndex((objetivo) => objetivo.id === objetivoId)
    if (index <= 0) {
      return
    }
    const [selected] = reordered.splice(index, 1)
    reordered.unshift(selected)
    objectives.reorderObjetivos(reordered.map((objetivo) => objetivo.id))
  }

  return (
    <section className="grid gap-8">
      <PageHeader
        actions={
          <Button
            disabled={busy}
            onClick={() => {
              setEditingObjetivo(null)
              setFormOpen(true)
            }}
          >
            Novo objetivo
          </Button>
        }
        description="Organize tarefas em torno do que você quer alcançar."
        title="Objetivos"
      />

      <StatusNotice status={objectives.status} />

      {formOpen && (
        <Dialog
          closeOnBackdrop={false}
          onClose={closeObjectiveForm}
          title={editingObjetivo ? "Editar objetivo" : "Novo objetivo"}
        >
          <ObjetivoForm
            editingObjetivo={editingObjetivo}
            loading={busy}
            onCancel={closeObjectiveForm}
            onSubmit={submitObjetivo}
          />
        </Dialog>
      )}

      <ObjetivoList
        loading={busy}
        tasksByObjetivo={objectives.tasksByObjetivo}
        objetivos={objectives.objetivos}
        onCreateTask={setTaskObjetivo}
        onDelete={setDeleteTarget}
        onEdit={(objetivo) => {
          setEditingObjetivo(objetivo)
          setFormOpen(true)
        }}
        onMoveToTop={moveObjetivoToTop}
        onUpdateStatus={objectives.updateObjetivoStatus}
      />

      {taskObjetivo && (
        <Dialog
          closeOnBackdrop={false}
          onClose={() => {
            setTaskObjetivo(null)
            board.setFormStatus(emptyStatus)
          }}
          title="Nova tarefa"
        >
          <TaskForm
            currentUser={user}
            initialObjetivoId={taskObjetivo.id}
            initialObjetivoTitulo={taskObjetivo.titulo}
            lockObjetivo
            loading={board.formLoading}
            onCancel={() => {
              setTaskObjetivo(null)
              board.setFormStatus(emptyStatus)
            }}
            onCreate={createTask}
            onUnauthorized={onUnauthorized}
            status={board.formStatus}
            token={token}
            timezone={user?.timezone}
          />
        </Dialog>
      )}

      {deleteTarget && (
        <ConfirmDialog
          cancelLabel="Cancelar"
          confirmLabel="Remover"
          message={`"${deleteTarget.titulo}" será removido. As tarefas vinculadas perderão esse vínculo.`}
          title="Remover objetivo"
          variant="danger"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            const removed = await objectives.deleteObjetivo(deleteTarget.id)
            if (removed) {
              setDeleteTarget(null)
            }
          }}
        />
      )}
    </section>
  )
}
