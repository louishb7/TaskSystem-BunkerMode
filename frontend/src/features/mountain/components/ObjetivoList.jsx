import React, { useMemo, useState } from "react";

import MountainDialog from "./MountainDialog.jsx";
import ObjetivoCard from "./ObjetivoCard.jsx";
import ObjetivoForm from "./ObjetivoForm.jsx";

export default function ObjetivoList({
  loading,
  missions = [],
  objetivos,
  onCreate,
  onCreateMission,
  onDelete,
  onUpdate,
  onUpdateProgress,
  onUpdateStatus,
  sonhos,
}) {
  const [formOpen, setFormOpen] = useState(false);
  const objetivosIsolados = useMemo(
    () => objetivos.filter((objetivo) => !objetivo.sonho_id),
    [objetivos]
  );
  const missionsPorObjetivo = useMemo(
    () => (missions || []).reduce((groups, mission) => {
      if (!mission.objetivo_id) {
        return groups;
      }
      const key = String(mission.objetivo_id);
      groups[key] = groups[key] || [];
      groups[key].push(mission);
      return groups;
    }, {}),
    [missions]
  );

  async function submit(payload) {
    const saved = await onCreate?.(payload);
    if (saved) {
      setFormOpen(false);
    }
  }

  if (objetivosIsolados.length === 0) {
    return null;
  }

  return (
    <section className="mountain-section isolated-objectives-section mountain-unlinked-ops">
      <div className="mountain-section-head">
        <div>
          <p className="section-kicker">OPERAÇÕES SEM TOPO DEFINIDO</p>
          <h2>Objetivos fora da escalada principal</h2>
          <p className="muted">Operações úteis podem existir sem Sonho, mas ficam fora da trilha estratégica principal.</p>
        </div>
        <button className="button secondary compact isolated-objective-action" disabled={loading} type="button" onClick={() => setFormOpen(true)}>
          NOVO OBJETIVO ISOLADO
        </button>
      </div>

      {formOpen && (
        <MountainDialog label="Novo objetivo isolado" onClose={() => setFormOpen(false)}>
          <div className="section-heading compact">
            <div>
              <p className="section-kicker fire">OBJETIVO ISOLADO</p>
              <h2>Registrar objetivo sem vínculo</h2>
            </div>
          </div>
          <ObjetivoForm
            loading={loading}
            onCancel={() => setFormOpen(false)}
            onSubmit={submit}
          />
        </MountainDialog>
      )}

      <div className="objetivo-list isolated-objectives-list">
        {objetivosIsolados.map((objetivo) => (
          <ObjetivoCard
            key={objetivo.id}
            loading={loading}
            missions={missionsPorObjetivo[String(objetivo.id)] || []}
            objetivo={objetivo}
            onCreateMission={onCreateMission}
            onDelete={onDelete}
            onUpdate={onUpdate}
            onUpdateProgress={onUpdateProgress}
            onUpdateStatus={onUpdateStatus}
            sonhos={sonhos}
          />
        ))}
      </div>
    </section>
  );
}
