import React from "react";

import EmptyState from "../../../components/ui/EmptyState.jsx";
import { isCompleted } from "../../../utils/missionStatus.js";
import MissionCard from "../../missions/components/MissionCard.jsx";

function isFailure(mission) {
  return String(mission?.status_code || "").startsWith("FALHA");
}

function groupMissions(missions) {
  return {
    critical: missions.filter((mission) => !isCompleted(mission) && mission?.is_decided === true),
    pending: missions.filter((mission) => !isCompleted(mission) && mission?.is_decided !== true && !isFailure(mission)),
    failures: missions.filter((mission) => !isCompleted(mission) && isFailure(mission)),
    completed: missions.filter(isCompleted),
  };
}

export default function OrdersPanel({
  decisionLoadingId,
  loading,
  onCreateOrder,
  onDeleteMission,
  onEditMission,
  onToggleDecision,
  selectedMissions,
}) {
  const groups = groupMissions(selectedMissions);
  const activeCount = groups.critical.length + groups.pending.length + groups.failures.length;
  const completedCount = groups.completed.length;

  function renderMissionGroup(label, missions, tone = "") {
    if (missions.length === 0) {
      return null;
    }

    return (
      <div className={`mission-group ${tone}`}>
        <div className="mission-group-header">
          <span>{label}</span>
          <strong>{missions.length}</strong>
        </div>
        <div className="mission-list">
          {missions.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onDelete={() => onDeleteMission(mission)}
              onEdit={() => onEditMission(mission)}
              onToggleDecision={() => onToggleDecision(mission)}
              toggling={decisionLoadingId === mission.id}
              variant="general"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="panel orders-panel">
      <div className="section-heading compact">
        <div>
          <p className="section-kicker">QUADRO DO DIA</p>
          <h2>Mesa operacional</h2>
          <p className="muted">
            {activeCount > 0
              ? `${activeCount} em aberto. ${completedCount} cumpridas permanecem arquivadas no quadro.`
              : completedCount > 0
                ? "Todas as ordens do dia foram cumpridas."
                : "Nenhuma ordem definida para o dia selecionado."}
          </p>
        </div>
        <button className="button fire create-order" type="button" onClick={onCreateOrder}>
          NOVA ORDEM
        </button>
      </div>

      {loading ? (
        <EmptyState
          title="Sincronizando comando"
          message="Carregando ordens do dia selecionado."
        />
      ) : selectedMissions.length > 0 ? (
        <div className="mission-groups">
          {renderMissionGroup("Inegociáveis", groups.critical, "critical")}
          {renderMissionGroup("Pendentes", groups.pending)}
          {renderMissionGroup("Falhas em leitura", groups.failures, "danger")}
          {renderMissionGroup("Cumpridas", groups.completed, "completed")}
        </div>
      ) : (
        <div className="empty-state action-empty">
          <h3>Dia sem ordens</h3>
          <p>Nenhuma ordem foi definida para o dia selecionado.</p>
          <button className="button fire compact" type="button" onClick={onCreateOrder}>
            NOVA ORDEM
          </button>
        </div>
      )}
    </section>
  );
}
