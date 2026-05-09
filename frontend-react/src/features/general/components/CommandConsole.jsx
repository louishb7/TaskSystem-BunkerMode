import React from "react";

export default function CommandConsole({ onCreateOrder }) {
  return (
    <section className="panel command-console">
      <p className="section-kicker">COMANDO</p>
      <h2>Próxima ação</h2>
      <p className="muted">
        Escolha um dia, revise o Leão do Dia e registre apenas ordens que devem ser executadas.
      </p>
      <button className="button secondary create-order" type="button" onClick={onCreateOrder}>
        CRIAR NOVA ORDEM
      </button>
    </section>
  );
}
