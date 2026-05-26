import React from "react";

import operationsAsset from "../../../assets/bunkermode/operations/operacoes.png";
import reviewAsset from "../../../assets/bunkermode/review/revisao-relatorio.png";
import BrandSymbol from "../../../components/ui/BrandSymbol.jsx";

export default function CommandRail({
  generalName,
  onLogout,
  onOpenMountain,
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
      <div className="rail-actions rail-nav">
        <button className="button secondary" type="button" onClick={onOpenMountain}>
          <span className="button-asset-label">
            <span className="rail-symbol" aria-hidden="true">▲</span>
            A MONTANHA
          </span>
        </button>
        <button className="button secondary" type="button" onClick={onOpenOperations}>
          <span className="button-asset-label">
            <img src={operationsAsset} alt="" />
            OPERAÇÕES
          </span>
        </button>
        <button className="button secondary" type="button" onClick={onOpenReview}>
          <span className="button-asset-label">
            <img src={reviewAsset} alt="" />
            ABRIR RELATÓRIO
          </span>
          {reviewCount > 0 && <span className="count-badge">{reviewCount}</span>}
        </button>
      </div>
      <div className="rail-actions rail-session">
        <button className="button secondary rail-danger" type="button" onClick={onLogout}>
          SAIR
        </button>
      </div>
    </aside>
  );
}
