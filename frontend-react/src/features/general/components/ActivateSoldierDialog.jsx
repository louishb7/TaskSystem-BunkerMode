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
        <p className="section-kicker fire">ATIVAR SOLDADO</p>
        <h2>Entrar em execução</h2>
        <p className="muted">
          O plano já foi decidido. Ao entrar em execução, planejamento fica bloqueado.
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
            {loading ? "ATIVANDO" : "ATIVAR SOLDADO"}
          </button>
        </div>
      </section>
    </div>
  );
}
