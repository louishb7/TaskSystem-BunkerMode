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
        <h2>Entrar em foco operacional</h2>
        <p className="muted">
          Chega de planejamento! É hora de executar.
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
            {loading ? "ATIVANDO" : "ATIVAR MODO SOLDADO"}
          </button>
        </div>
      </section>
    </div>
  );
}
