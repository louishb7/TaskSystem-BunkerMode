import React from "react";

import BrandSymbol from "../../../components/ui/BrandSymbol.jsx";

export default function CommandRail({
  generalName,
  loadingSoldier,
  onActivateSoldier,
  onCreateOrder,
  onLogout,
  onOpenReview,
  reviewCount,
  weekLabel,
}) {
  return (
    <aside className="command-rail panel">
      <div className="command-identity">
        <BrandSymbol muted size="sm" />
        <div>
          <p className="section-kicker fire">POSTO DE COMANDO</p>
          <h2>{generalName}</h2>
        </div>
      </div>
      <p className="rail-week">{weekLabel}</p>
      <div className="rail-actions">
        <button className="button fire" type="button" onClick={onCreateOrder}>
          REGISTRAR ORDEM
        </button>
        <button className="button secondary" type="button" onClick={onOpenReview}>
          ABRIR RELATÓRIO
          {reviewCount > 0 && <span className="count-badge">{reviewCount}</span>}
        </button>
        <button
          className="button fire command-activate"
          disabled={loadingSoldier}
          type="button"
          onClick={onActivateSoldier}
        >
          {loadingSoldier ? "ATIVANDO" : "ATIVAR SOLDADO"}
        </button>
        <button className="button secondary" type="button" onClick={onLogout}>
          SAIR
        </button>
      </div>
    </aside>
  );
}
