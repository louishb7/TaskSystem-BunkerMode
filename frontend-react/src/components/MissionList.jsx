import React from "react";

import MissionCard from "./MissionCard.jsx";

export default function MissionList({
  missions,
  loading,
  onEdit,
  onComplete,
  onDelete,
  onHistory,
  onToggleDecision,
  togglingDecisionId,
  planningLocked,
  canExecute,
}) {
  if (loading) {
    return (
      <div className="empty-state loading-state">
        <h3>Sincronizando o plano operacional</h3>
        <p>Carregando missões, prioridades e sinais de decisão.</p>
      </div>
    );
  }

  if (!missions.length) {
    return (
      <div className="empty-state">
        <h3>Nenhuma missão em curso</h3>
        <p>
          O quadro operacional está vazio. Defina a próxima ordem no posto do General
          para iniciar o ciclo de execução.
        </p>
      </div>
    );
  }

  return (
    <div className="mission-list">
      {missions.map((mission) => (
        <MissionCard
          key={mission.id}
          mission={mission}
          onEdit={onEdit}
          onComplete={onComplete}
          onDelete={onDelete}
          onHistory={onHistory}
          onToggleDecision={onToggleDecision}
          togglingDecision={togglingDecisionId === mission.id}
          planningLocked={planningLocked}
          canExecute={canExecute}
        />
      ))}
    </div>
  );
}
