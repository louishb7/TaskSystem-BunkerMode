import React from "react";

import StatusNotice from "../../../components/ui/StatusNotice.jsx";
import TacticalShell from "../../../components/tactical/TacticalShell.jsx";
import GeneralReviewPanel from "../components/GeneralReviewPanel.jsx";

export default function ReviewPage({
  loadingMissionId,
  missions,
  onBack,
  onReview,
  status,
}) {
  return (
    <TacticalShell mode="general">
      <section className="review-screen">
        <button className="button secondary back-command" type="button" onClick={onBack}>
          VOLTAR AO COMANDO
        </button>
        <section className="panel review-screen-header">
          <p className="section-kicker danger">PÓS-AÇÃO</p>
          <h1>Falhas aguardando decisão</h1>
          <p className="muted">
            Revise os registros do Soldado e decida com base nos dados da execução.
          </p>
        </section>
        <StatusNotice status={status} />
        <GeneralReviewPanel
          loadingMissionId={loadingMissionId}
          missions={missions}
          onReview={onReview}
        />
      </section>
    </TacticalShell>
  );
}
