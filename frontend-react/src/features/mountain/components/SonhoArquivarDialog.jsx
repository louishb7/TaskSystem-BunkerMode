import React, { useState } from "react";

export default function SonhoArquivarDialog({ loading, onCancel, onConfirm, sonho }) {
  const [justificativa, setJustificativa] = useState("");

  function submit(event) {
    event.preventDefault();
    onConfirm?.({ justificativa: justificativa.trim() });
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-card" role="dialog" aria-modal="true" aria-label="Arquivar campanha">
        <p className="section-kicker fire">ARQUIVAR SONHO</p>
        <h2>{sonho?.titulo || "Campanha estratégica"}</h2>
        <p className="muted">Você está encerrando uma campanha estratégica. Isso não apaga o caminho percorrido.</p>
        <form className="form-stack" onSubmit={submit}>
          <label>
            Justificativa
            <textarea
              required
              disabled={loading}
              rows="4"
              value={justificativa}
              onChange={(event) => setJustificativa(event.target.value)}
            />
          </label>
          <div className="actions-row">
            <button className="button secondary" disabled={loading} type="button" onClick={onCancel}>
              CANCELAR
            </button>
            <button className="button danger" disabled={loading} type="submit">
              ARQUIVAR CAMPANHA
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

