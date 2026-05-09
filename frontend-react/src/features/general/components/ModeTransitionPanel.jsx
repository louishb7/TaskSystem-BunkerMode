import React from "react";

export default function ModeTransitionPanel({
  loading,
  onActivateSoldier,
  reviewCount,
}) {
  return (
    <article className="panel transition-panel">
      <p className="section-kicker">TRANSIÇÃO DE MODO</p>
      <h2>Entregar ordens ao Soldado</h2>
      <p className="muted">
        {reviewCount > 0
          ? "Há revisão pendente. Decida quando entrar no protocolo de execução."
          : "Ative somente quando o plano estiver pronto para ser executado."}
      </p>
      <button
        className="mode-switch activate-soldier"
        type="button"
        onClick={onActivateSoldier}
        disabled={loading}
      >
        <span>MODO SOLDADO</span>
        <strong>ATIVAR SOLDADO</strong>
      </button>
    </article>
  );
}
