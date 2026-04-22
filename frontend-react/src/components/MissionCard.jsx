import React from "react";

function isDone(mission) {
  return String(mission.status || "").toLowerCase().includes("conclu");
}

function priorityLabel(priority) {
  return {
    1: "Alta",
    2: "Média",
    3: "Baixa",
  }[priority] || priority;
}

export default function MissionCard({
  mission,
  onEdit,
  onComplete,
  onDelete,
  onHistory,
}) {
  const done = isDone(mission);

  return (
    <article className={`mission-card ${done ? "done" : ""}`}>
      <header className="mission-card-header">
        <div>
          <span className="mission-id">Missão #{mission.id}</span>
          <h3>{mission.titulo}</h3>
        </div>
        <span className={`status-badge ${done ? "done" : "pending"}`}>
          {mission.status}
        </span>
      </header>

      <p className="mission-instruction">{mission.instrucao}</p>

      <div className="mission-meta">
        <span>Prioridade {priorityLabel(mission.prioridade)}</span>
        <span>{mission.prazo || "Sem prazo"}</span>
      </div>

      <div className="mission-actions">
        {!done && (
          <button className="button compact primary" type="button" onClick={() => onComplete(mission.id)}>
            Concluir
          </button>
        )}
        <button className="button compact secondary" type="button" onClick={() => onEdit(mission)}>
          Editar
        </button>
        <button className="button compact secondary" type="button" onClick={() => onHistory(mission.id)}>
          Histórico
        </button>
        <button className="button compact danger" type="button" onClick={() => onDelete(mission.id)}>
          Apagar
        </button>
      </div>

      {mission.history && (
        <pre className="history-output">{JSON.stringify(mission.history, null, 2)}</pre>
      )}
    </article>
  );
}
