import React from "react";

import BrandSymbol from "../../../components/ui/BrandSymbol.jsx";

export default function CommandRail({
  generalName,
  onLogout,
  onOpenOperations,
  onOpenReview,
  reviewCount,
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
      <p className="rail-note">Revise o quadro, abra o relatório e mantenha o comando limpo.</p>
      <div className="rail-actions">
        <button className="button secondary" type="button" onClick={onOpenReview}>
          ABRIR RELATÓRIO
          {reviewCount > 0 && <span className="count-badge">{reviewCount}</span>}
        </button>
        <button className="button secondary" type="button" onClick={onOpenOperations}>
          OPERAÇÕES
        </button>
        <button className="button secondary" type="button" onClick={onLogout}>
          SAIR
        </button>
      </div>
    </aside>
  );
}
