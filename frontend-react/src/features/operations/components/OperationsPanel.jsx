import React, { useMemo, useState } from "react";

import StatusNotice from "../../../components/ui/StatusNotice.jsx";

const WEEKDAYS = [
  { value: 0, label: "SEG" },
  { value: 1, label: "TER" },
  { value: 2, label: "QUA" },
  { value: 3, label: "QUI" },
  { value: 4, label: "SEX" },
  { value: 5, label: "SÁB" },
  { value: 6, label: "DOM" },
];

const initialForm = {
  nome: "",
  start_date: "",
  end_date: "",
  weekdays: [],
  ordem_titulo: "",
  ordem_instrucao: "",
  is_decided: false,
};

function formatDate(value) {
  if (!value) {
    return "--";
  }
  const [year, month, day] = String(value).slice(0, 10).split("-");
  if (!year || !month || !day) {
    return value;
  }
  return `${day}/${month}/${year}`;
}

function dateOnly(value) {
  if (!value) {
    return null;
  }
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function todayOnly() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function periodHasPassed(endDate) {
  const end = dateOnly(endDate);
  return end !== null && todayOnly() > end;
}

function weekdayLabels(values = []) {
  const set = new Set(values);
  return WEEKDAYS.filter((day) => set.has(day.value)).map((day) => day.label).join(" ");
}

function OperationItem({ loading, onCloseOperation, operation }) {
  const active = operation.status === "ativa";
  const canClose = active && periodHasPassed(operation.end_date);

  return (
    <article className={`operation-row ${active ? "active" : "closed"}`}>
      <div className="operation-row-header">
        <span className={`operation-status ${active ? "active" : "closed"}`}>
          {active ? "ATIVA" : "ENCERRADA"}
        </span>
        {canClose && (
          <button
            className="button secondary compact operation-close"
            disabled={loading}
            type="button"
            onClick={() => onCloseOperation?.(operation.id)}
          >
            ENCERRAR
          </button>
        )}
      </div>
      <strong>{operation.nome}</strong>
      <span className="operation-days">{weekdayLabels(operation.weekdays) || "SEM DIAS"}</span>
      <span className="operation-period">
        {formatDate(operation.start_date)} → {formatDate(operation.end_date)}
      </span>
      <small>{operation.ordem_titulo}</small>
    </article>
  );
}

export default function OperationsPanel({
  loading = false,
  onClose,
  onCloseOperation,
  onCreateOperation,
  operations = [],
  status,
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const activeOperations = useMemo(
    () => operations.filter((operation) => operation.status === "ativa"),
    [operations]
  );
  const closedOperations = useMemo(
    () => operations.filter((operation) => operation.status !== "ativa"),
    [operations]
  );

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleWeekday(value) {
    setForm((current) => {
      const selected = current.weekdays.includes(value)
        ? current.weekdays.filter((item) => item !== value)
        : [...current.weekdays, value].sort((a, b) => a - b);
      return { ...current, weekdays: selected };
    });
  }

  async function submit(event) {
    event.preventDefault();
    if (loading) {
      return;
    }
    const saved = await onCreateOperation?.({
      ...form,
      ordem_instrucao: form.ordem_instrucao || null,
    });
    if (saved) {
      setForm(initialForm);
      setFormOpen(false);
    }
  }

  return (
    <section className="command-operations">
      <div className="command-operations-head">
        <div>
          <span>OPERAÇÕES</span>
          <p>Crie, acompanhe e encerre planos por período.</p>
        </div>
        <div className="operation-panel-actions">
          <button
            className="button compact fire"
            disabled={loading}
            type="button"
            onClick={() => setFormOpen((current) => !current)}
          >
            {formOpen ? "FECHAR FORMULÁRIO" : "CRIAR OPERAÇÃO"}
          </button>
          <button className="button secondary compact" disabled={loading} type="button" onClick={onClose}>
            FECHAR
          </button>
        </div>
      </div>

      <StatusNotice status={status} />

      {formOpen && (
        <form className="operation-form" onSubmit={submit}>
          <label>
            Nome da operação
            <input
              disabled={loading}
              required
              type="text"
              value={form.nome}
              onChange={(event) => updateField("nome", event.target.value)}
            />
          </label>
          <div className="operation-form-grid">
            <label className="operation-date-field">
              Início da operação
              <input
                disabled={loading}
                required
                className="operation-date-input"
                type="date"
                value={form.start_date}
                onChange={(event) => updateField("start_date", event.target.value)}
              />
            </label>
            <label className="operation-date-field">
              Fim da operação
              <input
                disabled={loading}
                required
                className="operation-date-input"
                type="date"
                value={form.end_date}
                onChange={(event) => updateField("end_date", event.target.value)}
              />
            </label>
          </div>
          <fieldset className="weekday-fieldset">
            <legend>Dias de execução</legend>
            <div className="weekday-grid">
              {WEEKDAYS.map((day) => (
                <label key={day.value} className={form.weekdays.includes(day.value) ? "selected" : ""}>
                  <input
                    checked={form.weekdays.includes(day.value)}
                    disabled={loading}
                    type="checkbox"
                    onChange={() => toggleWeekday(day.value)}
                  />
                  <span>{day.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label>
            Ordem diária
            <input
              disabled={loading}
              required
              type="text"
              value={form.ordem_titulo}
              onChange={(event) => updateField("ordem_titulo", event.target.value)}
            />
          </label>
          <label>
            Instrução opcional
            <textarea
              disabled={loading}
              rows={2}
              value={form.ordem_instrucao}
              onChange={(event) => updateField("ordem_instrucao", event.target.value)}
            />
          </label>
          <label className="toggle-row">
            <input
              checked={form.is_decided}
              disabled={loading}
              type="checkbox"
              onChange={(event) => updateField("is_decided", event.target.checked)}
            />
            <span>Marcar ordens como Decididas</span>
          </label>
          <button className="button fire full" disabled={loading} type="submit">
            {loading ? "REGISTRANDO" : "REGISTRAR OPERAÇÃO"}
          </button>
        </form>
      )}

      <div className="operations-list">
        <h3>Ativas</h3>
        {activeOperations.length === 0 && <p className="empty-copy">Nenhuma operação ativa.</p>}
        {activeOperations.map((operation) => (
          <OperationItem
            key={operation.id}
            loading={loading}
            onCloseOperation={onCloseOperation}
            operation={operation}
          />
        ))}
      </div>

      <div className="operations-list muted">
        <h3>Encerradas</h3>
        {closedOperations.length === 0 && <p className="empty-copy">Arquivo sem operações encerradas.</p>}
        {closedOperations.slice(0, 4).map((operation) => (
          <OperationItem key={operation.id} operation={operation} />
        ))}
      </div>
    </section>
  );
}
