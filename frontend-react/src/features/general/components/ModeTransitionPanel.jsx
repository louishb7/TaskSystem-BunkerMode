import React from "react";

export default function ModeTransitionPanel({ loading, onActivateSoldier, orderCount = 0, reviewCount }) {
  return (
    <article className="panel mode-transition-panel">
      <div>
        <p className="section-kicker fire">EXECUÇÃO</p>
        <h2>Ativar Soldado</h2>
        <p className="muted">
          {reviewCount > 0
            ? "Há revisão pendente. Ative somente se o plano de execução estiver claro."
            : "Ao entrar em execução, planejamento fica bloqueado."}
        </p>
        <p className="mode-transition-count">
          {orderCount === 1 ? "1 ordem no dia selecionado." : `${orderCount} ordens no dia selecionado.`}
        </p>
      </div>
      <button className="button fire full" disabled={loading} type="button" onClick={onActivateSoldier}>
        {loading ? "ATIVANDO" : "ATIVAR SOLDADO"}
      </button>
    </article>
  );
}
