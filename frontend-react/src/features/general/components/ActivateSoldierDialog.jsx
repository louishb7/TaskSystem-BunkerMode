import React from "react";

export default function ActivateSoldierDialog({
  loading,
  onCancel,
  onConfirm,
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-card" role="dialog" aria-modal="true">
        <p className="section-kicker danger">MODO SOLDADO</p>
        <h2>Entrar em execução</h2>
        <p className="muted">
          O General já decidiu. Ao entrar, o Soldado executa sem editar, apagar ou renegociar ordens.
        </p>
        <div className="actions-row">
          <button className="button secondary" type="button" onClick={onCancel}>
            CANCELAR
          </button>
          <button className="button danger" type="button" onClick={onConfirm} disabled={loading}>
            {loading ? "ATIVANDO" : "ATIVAR SOLDADO"}
          </button>
        </div>
      </section>
    </div>
  );
}
