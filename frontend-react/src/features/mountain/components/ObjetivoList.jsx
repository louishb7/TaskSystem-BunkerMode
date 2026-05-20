import React, { useMemo, useState } from "react";

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
  objetivos,
  onCreate,
  onDelete,
  onUpdate,
  onUpdateProgress,
  onUpdateStatus,
  sonhos,
}) {
  const [formOpen, setFormOpen] = useState(false);
  const grouped = useMemo(
    () => groups.map(([status, label]) => ({
      status,
      label,
      objetivos: objetivos.filter((objetivo) => objetivo.status === status),
    })),
    [objetivos]
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
          <p className="section-kicker fire">OBJETIVOS</p>
          <h2>Corpo da montanha</h2>
        </div>
        <button className="button fire compact" disabled={loading} type="button" onClick={() => setFormOpen(true)}>
          NOVO OBJETIVO
        </button>
      </div>

      {formOpen && (
        <div className="objetivo-form-panel">
          <ObjetivoForm
            loading={loading}
            onCancel={() => setFormOpen(false)}
            onSubmit={submit}
            sonhos={sonhos}
          />
        </div>
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
