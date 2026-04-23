import React from "react";

export default function MissionToolbar({ filters, onChange, onRefresh, loading }) {
  function updateFilter(event) {
    onChange({
      ...filters,
      [event.target.name]: event.target.value,
    });
  }

  return (
    <div className="toolbar">
      <div className="toolbar-section toolbar-search">
        <label>
          Buscar
          <input
            name="search"
            value={filters.search}
            onChange={updateFilter}
            placeholder="Título ou instrução"
          />
        </label>
      </div>

      <div className="toolbar-section">
        <label>
          Status
          <select name="status" value={filters.status} onChange={updateFilter}>
            <option value="todas">Todas</option>
            <option value="pendente">Pendentes</option>
            <option value="concluida">Concluídas</option>
          </select>
        </label>
      </div>

      <div className="toolbar-section">
        <label>
          Decisão
          <select name="decided" value={filters.decided} onChange={updateFilter}>
            <option value="todas">Todas</option>
            <option value="decididas">Decididas</option>
            <option value="nao_decididas">Sem decisão</option>
          </select>
        </label>
      </div>

      <div className="toolbar-section">
        <label>
          Ordenar
          <select name="sort" value={filters.sort} onChange={updateFilter}>
            <option value="prioridade">Prioridade</option>
            <option value="titulo">Título</option>
            <option value="prazo">Prazo</option>
          </select>
        </label>
      </div>

      <div className="toolbar-action">
        <button className="button secondary" type="button" onClick={onRefresh} disabled={loading}>
          {loading ? "Atualizando..." : "Atualizar quadro"}
        </button>
      </div>
    </div>
  );
}
