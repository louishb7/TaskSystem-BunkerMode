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
      <label>
        Buscar
        <input
          name="search"
          value={filters.search}
          onChange={updateFilter}
          placeholder="Título ou instrução"
        />
      </label>

      <label>
        Status
        <select name="status" value={filters.status} onChange={updateFilter}>
          <option value="todas">Todas</option>
          <option value="pendente">Pendentes</option>
          <option value="concluida">Concluídas</option>
        </select>
      </label>

      <label>
        Ordenar
        <select name="sort" value={filters.sort} onChange={updateFilter}>
          <option value="prioridade">Prioridade</option>
          <option value="titulo">Título</option>
          <option value="prazo">Prazo</option>
        </select>
      </label>

      <button className="button secondary" type="button" onClick={onRefresh} disabled={loading}>
        {loading ? "Atualizando..." : "Atualizar"}
      </button>
    </div>
  );
}
