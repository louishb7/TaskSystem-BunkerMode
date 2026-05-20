import React, { useMemo, useState } from "react";

import SonhoArquivarDialog from "./SonhoArquivarDialog.jsx";
import SonhoForm from "./SonhoForm.jsx";

export default function SonhoPanel({
  loading,
  onArchive,
  onCreate,
  onPromote,
  onUpdate,
  sonhos,
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingSonho, setEditingSonho] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const principal = useMemo(
    () => sonhos.find((sonho) => sonho.status === "ativo" && sonho.tipo === "principal"),
    [sonhos]
  );
  const secundarios = useMemo(
    () => sonhos.filter((sonho) => sonho.status === "ativo" && sonho.tipo === "secundario"),
    [sonhos]
  );

  async function submit(payload) {
    const saved = editingSonho
      ? await onUpdate?.(editingSonho.id, payload)
      : await onCreate?.(payload);
    if (saved) {
      setFormOpen(false);
      setEditingSonho(null);
    }
  }

  return (
    <section className="mountain-section">
      <div className="mountain-section-head">
        <div>
          <p className="section-kicker fire">SONHOS</p>
          <h2>Topo da montanha</h2>
        </div>
        <button className="button fire compact" disabled={loading} type="button" onClick={() => setFormOpen(true)}>
          NOVO SONHO
        </button>
      </div>

      {formOpen && (
        <SonhoForm
          editingSonho={editingSonho}
          loading={loading}
          onCancel={() => {
            setFormOpen(false);
            setEditingSonho(null);
          }}
          onSubmit={submit}
        />
      )}

      <div className="sonho-grid">
        <article className="sonho-card principal">
          <span className="meta-tag critical">PRINCIPAL</span>
          <h3>{principal?.titulo || "Nenhum sonho principal"}</h3>
          <p>{principal?.descricao || "Defina a campanha estratégica que orienta o comando."}</p>
          {principal && (
            <div className="mountain-card-actions">
              <button className="button secondary compact" disabled={loading} type="button" onClick={() => {
                setEditingSonho(principal);
                setFormOpen(true);
              }}>
                EDITAR
              </button>
              <button className="button secondary compact" disabled={loading} type="button" onClick={() => setArchiveTarget(principal)}>
                ARQUIVAR
              </button>
            </div>
          )}
        </article>

        <div className="sonho-secondary-list">
          {secundarios.length === 0 && <p className="muted">Nenhum sonho secundário ativo.</p>}
          {secundarios.map((sonho) => (
            <article className="sonho-card secondary" key={sonho.id}>
              <span className="meta-tag">SECUNDÁRIO</span>
              <h3>{sonho.titulo}</h3>
              {sonho.descricao && <p>{sonho.descricao}</p>}
              <div className="mountain-card-actions">
                <button className="button secondary compact" disabled={loading} type="button" onClick={() => onPromote?.(sonho.id)}>
                  PROMOVER
                </button>
                <button className="button secondary compact" disabled={loading} type="button" onClick={() => {
                  setEditingSonho(sonho);
                  setFormOpen(true);
                }}>
                  EDITAR
                </button>
                <button className="button secondary compact" disabled={loading} type="button" onClick={() => setArchiveTarget(sonho)}>
                  ARQUIVAR
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {archiveTarget && (
        <SonhoArquivarDialog
          loading={loading}
          sonho={archiveTarget}
          onCancel={() => setArchiveTarget(null)}
          onConfirm={async (payload) => {
            const archived = await onArchive?.(archiveTarget.id, payload);
            if (archived) {
              setArchiveTarget(null);
            }
          }}
        />
      )}
    </section>
  );
}

