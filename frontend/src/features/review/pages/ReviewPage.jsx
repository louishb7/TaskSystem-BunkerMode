import React from "react"

import reviewAsset from "../../../assets/bunkermode/review/revisao-relatorio.png"
import StatusNotice from "../../../components/ui/StatusNotice.jsx"
import TacticalShell from "../../../components/tactical/TacticalShell.jsx"
import GeneralReviewPanel from "../components/GeneralReviewPanel.jsx"

export default function ReviewPage({
  allMissions,
  loadingMissionId,
  missions,
  onBack,
  onClearFailures,
  onCloseReview,
  onReview,
  reviewState,
  status,
  weeklyReviews,
}) {
  return (
    <TacticalShell mode="general">
      <section className="review-screen">
        <button className="button secondary back-command" type="button" onClick={onBack}>
          VOLTAR AO COMANDO
        </button>
        <section className="panel review-screen-header">
          <div className="asset-heading">
            <img src={reviewAsset} alt="" />
            <div>
              <p className="section-kicker fire">RELATÓRIO</p>
              <h1>Leitura da execução</h1>
              <p className="muted">
                Revise o período, identifique falhas reais e decida apenas o que exige comando.
              </p>
            </div>
          </div>
        </section>
        <StatusNotice status={status} />
        <GeneralReviewPanel
          allMissions={allMissions}
          loadingMissionId={loadingMissionId}
          missions={missions}
          onClearFailures={onClearFailures}
          onCloseReview={onCloseReview}
          onReview={onReview}
          reviewState={reviewState}
          weeklyReviews={weeklyReviews}
        />
      </section>
    </TacticalShell>
  )
}
