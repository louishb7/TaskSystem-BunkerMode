import React from "react";

export default function ActivateSoldierDialog({
  loading,
  onCancel,
  onConfirm,
  orderCount = 0,
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-card" role="dialog" aria-modal="true">
        <p className="section-kicker fire">CAÇADA</p>
        <h2>Iniciar caçada</h2>
        <p className="muted">
          O plano está definido. Ao entrar em execução, planejamento fica bloqueado.
        </p>
        <div className="protocol-brief">
          <span>{orderCount === 1 ? "1 ordem disponível" : `${orderCount} ordens disponíveis`}</span>
          <span>Sem criação, edição ou renegociação.</span>
          <span>O Soldado executa apenas o que está no quadro.</span>
        </div>
        <div className="actions-row">
          <button className="button secondary" type="button" onClick={onCancel}>
            CANCELAR
          </button>
          <button className="button fire" type="button" onClick={onConfirm} disabled={loading}>
            {loading ? "ABRINDO" : "INICIAR CAÇADA"}
          </button>
        </div>
      </section>
    </div>
  );
}
