import React, { useMemo, useState } from "react";

import MountainDialog from "./MountainDialog.jsx";
import ObjetivoCard from "./ObjetivoCard.jsx";
import ObjetivoForm from "./ObjetivoForm.jsx";

const groups = [
  ["ativo", "ATIVO"],
  ["pausado", "PAUSADO"],
  ["abandonado", "ABANDONADO"],
  ["concluido", "CONCLUÍDO"],
];

export default function ObjetivoList({
  loading,
  missions = [],
  objetivos,
  onCreate,
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
  const grouped = useMemo(
    () => groups.map(([status, label]) => ({
      status,
      label,
      objetivos: objetivosIsolados.filter((objetivo) => objetivo.status === status),
    })),
    [objetivosIsolados]
  );

  async function submit(payload) {
    const saved = await onCreate?.(payload);
    if (saved) {
      setFormOpen(false);
    }
  }

  return (
    <section className="mountain-section">
      <div className="mountain-section-head">
        <div>
          <p className="section-kicker fire">OBJETIVOS ISOLADOS</p>
          <h2>Fora da árvore principal</h2>
        </div>
        <button className="button secondary compact" disabled={loading} type="button" onClick={() => setFormOpen(true)}>
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

      <div className="objetivo-groups">
        {grouped.map((group) => (
          <section className={`objetivo-group group-${group.status}`} key={group.status}>
            <div className="objetivo-group-title">
              <h3>{group.label}</h3>
              <span>{group.objetivos.length}</span>
            </div>

            {group.objetivos.length === 0 ? (
              <p className="muted">Nenhum objetivo neste estado.</p>
            ) : (
              <div className="objetivo-list">
                {group.objetivos.map((objetivo) => (
                  <ObjetivoCard
                    key={objetivo.id}
                    loading={loading}
                    missions={missions.filter((mission) => mission.objetivo_id === objetivo.id)}
                    objetivo={objetivo}
                    onDelete={onDelete}
                    onUpdate={onUpdate}
                    onUpdateProgress={onUpdateProgress}
                    onUpdateStatus={onUpdateStatus}
                    sonhos={sonhos}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </section>
  );
}
