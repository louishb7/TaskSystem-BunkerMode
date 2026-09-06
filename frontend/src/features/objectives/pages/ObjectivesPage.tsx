import React, { useState } from "react"

import ConfirmDialog from "../../../components/ui/ConfirmDialog"
import Dialog from "../../../components/ui/Dialog"
import StatusNotice from "../../../components/ui/StatusNotice"
import { emptyStatus } from "../../../constants/uiState"
import MissionForm from "../../missions/components/MissionForm"
import ObjetivoForm from "../components/ObjetivoForm"
import ObjetivoList from "../components/ObjetivoList"
import { useObjectives } from "../hooks/useObjectives"

export default function ObjectivesPage({ board, onUnauthorized, token, user }) {
  const objectives = useObjectives({ onUnauthorized, token })
  const [editingObjetivo, setEditingObjetivo] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [missionObjetivo, setMissionObjetivo] = useState(null)
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

  async function createMission(payload) {
    const saved = await board.createMission(payload)
    if (saved) {
      setMissionObjetivo(null)
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
    <section className="objectives-page">
        <header className="section-heading">
          <div>
            <p className="section-kicker fire">PLANEJAMENTO</p>
            <h1>Objetivos</h1>
            <p className="muted">
              Direções independentes que podem receber ordens quando necessário.
            </p>
          </div>
          <button
            className="button fire compact"
            disabled={busy}
            type="button"
            onClick={() => {
              setEditingObjetivo(null)
              setFormOpen(true)
            }}
          >
            NOVO OBJETIVO
          </button>
        </header>

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
          missionCounts={objectives.missionCounts}
          objetivos={objectives.objetivos}
          onCreateMission={setMissionObjetivo}
          onDelete={setDeleteTarget}
          onEdit={(objetivo) => {
            setEditingObjetivo(objetivo)
            setFormOpen(true)
          }}
          onMoveToTop={moveObjetivoToTop}
          onUpdateStatus={objectives.updateObjetivoStatus}
        />

        {missionObjetivo && (
          <Dialog
            closeOnBackdrop={false}
            onClose={() => {
              setMissionObjetivo(null)
              board.setFormStatus(emptyStatus)
            }}
            title="Nova ordem"
          >
            <MissionForm
              currentUser={user}
              initialObjetivoId={missionObjetivo.id}
              initialObjetivoTitulo={missionObjetivo.titulo}
              lockObjetivo
              loading={board.formLoading}
              onCancel={() => {
                setMissionObjetivo(null)
                board.setFormStatus(emptyStatus)
              }}
              onCreate={createMission}
              onUnauthorized={onUnauthorized}
              status={board.formStatus}
              token={token}
              timezone={user?.timezone}
            />
          </Dialog>
        )}

        {deleteTarget && (
          <ConfirmDialog
            confirmLabel="REMOVER"
            message={`"${deleteTarget.titulo}" será removido. As ordens vinculadas perderão esse vínculo.`}
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
