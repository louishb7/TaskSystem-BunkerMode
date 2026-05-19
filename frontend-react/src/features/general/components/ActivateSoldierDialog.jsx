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
        <p className="section-kicker fire">FOCO OPERACIONAL</p>
        <h2>Entrar em foco</h2>
        <p className="muted">
          Abra uma interface mais simples para executar com menos ruído.
        </p>
        <div className="protocol-brief">
          <span>{orderCount === 1 ? "1 ordem disponível" : `${orderCount} ordens disponíveis`}</span>
          <span>Menos informação, mais ação imediata.</span>
          <span>Você pode retornar ao comando quando precisar.</span>
        </div>
        <div className="actions-row">
          <button className="button secondary" type="button" onClick={onCancel}>
            CANCELAR
          </button>
          <button className="button fire" type="button" onClick={onConfirm} disabled={loading}>
            {loading ? "ABRINDO" : "ENTRAR EM FOCO"}
          </button>
        </div>
      </section>
    </div>
  );
}
