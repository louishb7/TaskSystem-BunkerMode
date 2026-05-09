import React from "react";

import BrandSymbol from "../../../components/ui/BrandSymbol.jsx";

export default function CommandRail({
  generalName,
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
          <p className="section-kicker">POSTO DE COMANDO</p>
          <h2>{generalName}</h2>
        </div>
      </div>
      <p className="rail-week">{weekLabel}</p>
      <div className="rail-actions">
        <button className="button secondary" type="button" onClick={onOpenReview}>
          RELATÓRIO
          {reviewCount > 0 && <span className="count-badge">{reviewCount}</span>}
        </button>
        <button className="button secondary" type="button" onClick={onLogout}>
          SAIR
        </button>
      </div>
    </aside>
  );
}
