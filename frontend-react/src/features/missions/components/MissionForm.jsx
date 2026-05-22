import React, { useEffect, useState } from "react";

import { getErrorMessage } from "../../../api/httpClient.js";
import { api } from "../../../services/bunkermodeApi.js";
import { formatDateForApi, getTomorrow } from "../../../utils/date.js";

const emptyForm = {
  titulo: "",
  instrucao: "",
  objetivo_id: "",
  recurrence_weekdays: [],
  duration_type: "ate_objetivo",
  recurrence_end_date: "",
  prazoTipo: "hoje",
  prazo: "",
};

const MISSION_INSTRUCTION_MAX_LENGTH = 280;

const weekdayOptions = [
  [0, "Seg"],
  [1, "Ter"],
  [2, "Qua"],
  [3, "Qui"],
  [4, "Sex"],
  [5, "Sáb"],
  [6, "Dom"],
];

function getUserId(user) {
  return user?.usuario_id ?? user?.id;
}

function initialPrazoTipo(mission, initialPrazo) {
  return mission?.prazo || initialPrazo ? "data_especifica" : "amanha";
}

function formatPrazoContext(prazo) {
  if (!prazo || typeof prazo !== "string") {
    return "";
  }

  const [day, month] = prazo.split("-");
  if (!day || !month) {
    return prazo;
  }

  return `${day}/${month}`;
}

// Converte DD-MM-AAAA -> AAAA-MM-DD para o input type="date".
function toDateInputValue(prazo) {
  if (!prazo || typeof prazo !== "string") {
    return "";
  }
  const parts = prazo.split("-");
  if (parts.length !== 3) {
    return "";
  }
  const [day, month, year] = parts;
  if (!day || !month || !year || year.length !== 4) {
    return "";
  }
  return `${year}-${month}-${day}`;
}

// Converte AAAA-MM-DD para DD-MM-AAAA, formato esperado pela API.
function fromDateInputValue(value) {
  if (!value || typeof value !== "string") {
    return "";
  }
  const parts = value.split("-");
  if (parts.length !== 3) {
    return "";
  }
  const [year, month, day] = parts;
  return `${day}-${month}-${year}`;
}

export default function MissionForm({
  currentUser,
  editingMission,
  initialObjetivoId,
  initialObjetivoTitulo,
  initialPrazo,
  lockObjetivo = false,
  loading,
  onCancel,
  onCreate,
  onUnauthorized,
  onUpdate,
  status,
  token,
}) {
  const [form, setForm] = useState({
    ...emptyForm,
    objetivo_id: initialObjetivoId ? String(initialObjetivoId) : emptyForm.objetivo_id,
    prazoTipo: initialPrazo ? "data_especifica" : emptyForm.prazoTipo,
    prazo: initialPrazo || "",
  });
  const [objetivos, setObjetivos] = useState([]);
  const [objetivoStatus, setObjetivoStatus] = useState("");

  const isEditing = Boolean(editingMission);
  const lockedInitialPrazo = Boolean(initialPrazo && !isEditing);
  const prazoContext = formatPrazoContext(initialPrazo);

  useEffect(() => {
    if (!editingMission) {
      setForm({
        ...emptyForm,
        objetivo_id: initialObjetivoId ? String(initialObjetivoId) : emptyForm.objetivo_id,
        prazoTipo: initialPrazo ? "data_especifica" : emptyForm.prazoTipo,
        prazo: initialPrazo || "",
      });
      return;
    }

    setForm({
      titulo: editingMission.titulo || "",
      instrucao: editingMission.instrucao || "",
      objetivo_id: editingMission.objetivo_id ? String(editingMission.objetivo_id) : "",
      recurrence_weekdays: Array.isArray(editingMission.recurrence_weekdays) ? editingMission.recurrence_weekdays : [],
      duration_type: editingMission.duration_type === "prazo" ? "prazo" : "ate_objetivo",
      recurrence_end_date: editingMission.recurrence_end_date || "",
      prazoTipo: initialPrazoTipo(editingMission, initialPrazo),
      prazo: editingMission.prazo || initialPrazo || "",
    });
  }, [editingMission, initialObjetivoId, initialPrazo]);

  useEffect(() => {
    async function loadObjetivos() {
      if (!token) {
        return;
      }

      const result = await api.listObjetivos(token);
      if (onUnauthorized?.(result)) {
        return;
      }

      if (!result.ok) {
        setObjetivoStatus(getErrorMessage(result, "Não foi possível carregar objetivos."));
        return;
      }

      setObjetivos((Array.isArray(result.data) ? result.data : []).filter((objetivo) => objetivo.status === "ativo"));
      setObjetivoStatus("");
    }

    loadObjetivos();
  }, [onUnauthorized, token]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === "instrucao" ? value.slice(0, MISSION_INSTRUCTION_MAX_LENGTH) : value,
    }));
  }

  function handleDateChange(event) {
    setForm((current) => ({
      ...current,
      prazo: fromDateInputValue(event.target.value),
    }));
  }

  function handleRecurrenceEndDateChange(event) {
    setForm((current) => ({
      ...current,
      recurrence_end_date: fromDateInputValue(event.target.value),
    }));
  }

  function toggleWeekday(weekday) {
    setForm((current) => {
      const selected = current.recurrence_weekdays.includes(weekday)
        ? current.recurrence_weekdays.filter((item) => item !== weekday)
        : [...current.recurrence_weekdays, weekday].sort();
      return { ...current, recurrence_weekdays: selected };
    });
  }

  function buildDeadline() {
    if (form.prazoTipo === "data_especifica") {
      return form.prazo.trim();
    }

    if (form.prazoTipo === "amanha") {
      return formatDateForApi(getTomorrow());
    }

    return formatDateForApi(new Date());
  }

  function submit(event) {
    event.preventDefault();
    const linkedToObjective = Boolean(form.objetivo_id);
    const payload = {
      titulo: form.titulo.trim(),
      instrucao: form.instrucao.trim(),
      objetivo_id: linkedToObjective ? Number(form.objetivo_id) : null,
      prazo: buildDeadline(),
    };

    if (linkedToObjective) {
      payload.recurrence_weekdays = form.recurrence_weekdays.length > 0 ? form.recurrence_weekdays : null;
      payload.duration_type = form.recurrence_weekdays.length > 0 ? form.duration_type : null;
      payload.recurrence_end_date = (
        form.recurrence_weekdays.length > 0
        && form.duration_type === "prazo"
        && form.recurrence_end_date
      )
        ? form.recurrence_end_date
        : null;
    } else {
      payload.recurrence_weekdays = null;
      payload.duration_type = null;
      payload.recurrence_end_date = null;
    }

    if (isEditing) {
      onUpdate(editingMission.id, payload);
      return;
    }

    payload.responsavel_id = getUserId(currentUser);
    onCreate(payload);
  }

  return (
    <section className="panel mission-form">
      <div className="section-heading compact">
        <div>
          <h2>{isEditing ? "Editar ordem" : "Nova ordem"}</h2>
          <p className="muted">A ordem deve dizer exatamente o que será executado.</p>
        </div>
      </div>

      <form className="form-stack" onSubmit={submit}>
        {lockedInitialPrazo && (
          <div className="deadline-context">
            <span>DATA DEFINIDA</span>
            <strong>{prazoContext}</strong>
          </div>
        )}

        <label>
          Título
          <input
            name="titulo"
            onChange={updateField}
            placeholder="Ex.: Revisar plano semanal"
            value={form.titulo}
          />
        </label>

        <label>
          Instrução opcional
          <textarea
            maxLength={MISSION_INSTRUCTION_MAX_LENGTH}
            name="instrucao"
            onChange={updateField}
            placeholder="Detalhe apenas se a ordem precisar de contexto"
            rows="5"
            value={form.instrucao}
          />
          <span className="field-counter">
            {form.instrucao.length}/{MISSION_INSTRUCTION_MAX_LENGTH}
          </span>
        </label>

        {lockObjetivo ? (
          <div className="deadline-context objective-context">
            <span>OBJETIVO VINCULADO</span>
            <strong>{initialObjetivoTitulo || "Objetivo selecionado"}</strong>
          </div>
        ) : (
          <label>
            Objetivo
            <select name="objetivo_id" onChange={updateField} value={form.objetivo_id}>
              <option value="">Sem objetivo</option>
              {objetivos.map((objetivo) => (
                <option key={objetivo.id} value={objetivo.id}>
                  {objetivo.titulo}
                </option>
              ))}
            </select>
          </label>
        )}
        {objetivoStatus && <p className="feedback error">{objetivoStatus}</p>}

        {form.objetivo_id && (
          <div className="linked-mission-options">
            <label>
              Duração
              <select name="duration_type" onChange={updateField} value={form.duration_type}>
                <option value="ate_objetivo">Até atingir o objetivo</option>
                <option value="prazo">Prazo determinado</option>
              </select>
            </label>

            {form.duration_type === "prazo" && (
              <label>
                Encerrar em
                <input
                  name="recurrence_end_date"
                  type="date"
                  onChange={handleRecurrenceEndDateChange}
                  value={toDateInputValue(form.recurrence_end_date)}
                />
              </label>
            )}

            <fieldset className="weekday-fieldset">
              <legend>Frequência semanal</legend>
              <div className="weekday-options">
                {weekdayOptions.map(([value, label]) => (
                  <label key={value} className={form.recurrence_weekdays.includes(value) ? "active" : ""}>
                    <input
                      checked={form.recurrence_weekdays.includes(value)}
                      onChange={() => toggleWeekday(value)}
                      type="checkbox"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {!lockedInitialPrazo && (
          <>
            <div className="segmented-control deadline-control">
              {[
                ["hoje", "Hoje"],
                ["amanha", "Amanhã"],
                ["data_especifica", "Data específica"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={form.prazoTipo === value ? "active" : ""}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, prazoTipo: value }))}
                >
                  {label}
                </button>
              ))}
            </div>

            {form.prazoTipo === "data_especifica" && (
              <label>
                Data
                <input
                  name="prazo"
                  type="date"
                  onChange={handleDateChange}
                  value={toDateInputValue(form.prazo)}
                />
              </label>
            )}
          </>
        )}

        {status.message && <p className={`feedback ${status.type}`}>{status.message}</p>}

        <div className="actions-row">
          <button className="button fire" disabled={loading} type="submit">
            {loading ? "AGUARDE" : isEditing ? "SALVAR EDIÇÃO" : "REGISTRAR ORDEM"}
          </button>
          <button className="button secondary" type="button" onClick={onCancel} disabled={loading}>
            CANCELAR
          </button>
        </div>
      </form>
    </section>
  );
}
