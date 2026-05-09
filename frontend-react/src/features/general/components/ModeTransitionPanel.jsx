import React from "react";

export default function ModeTransitionPanel({ loading, onActivateSoldier, reviewCount }) {
  return (
    <article className="panel mode-transition-panel">
      <div>
        <p className="section-kicker fire">EXECUÇÃO</p>
        <h2>Entrar em foco</h2>
        <p className="muted">
          {reviewCount > 0
            ? "Há relatório pendente. Ative quando a execução de hoje estiver clara."
            : "Bloqueia planejamento e mantém apenas as ordens do dia."}
        </p>
      </div>
      <button className="button fire full" disabled={loading} type="button" onClick={onActivateSoldier}>
        {loading ? "ATIVANDO" : "ATIVAR SOLDADO"}
      </button>
    </article>
  );
}
