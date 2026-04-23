import MissionCard from "./MissionCard.jsx";

export default function MissionList({
  missions,
  loading,
  onEdit,
  onComplete,
  onDelete,
  onHistory,
}) {
  if (loading) {
    return <div className="empty-state">Carregando missões...</div>;
  }

  if (!missions.length) {
    return (
      <div className="empty-state">
        <h3>Nenhuma missão encontrada</h3>
        <p>Crie uma missão ou ajuste os filtros para voltar ao plano de execução.</p>
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
        />
      ))}
    </div>
  );
}
