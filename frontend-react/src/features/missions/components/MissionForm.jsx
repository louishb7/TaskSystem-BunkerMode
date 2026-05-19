import React, { useEffect, useState } from "react";

import { formatDateForApi, getTomorrow } from "../../../utils/date.js";

const emptyForm = {
  titulo: "",
  instrucao: "",
  prazoTipo: "hoje",
  prazo: "",
};

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

export default function MissionForm({
  currentUser,
  editingMission,
  initialPrazo,
  loading,
  onCancel,
  onCreate,
  onUpdate,
  status,
}) {
  const [form, setForm] = useState({
    ...emptyForm,
    prazoTipo: initialPrazo ? "data_especifica" : emptyForm.prazoTipo,
    prazo: initialPrazo || "",
  });

  const isEditing = Boolean(editingMission);
  const lockedInitialPrazo = Boolean(initialPrazo && !isEditing);
  const prazoContext = formatPrazoContext(initialPrazo);

  useEffect(() => {
    if (!editingMission) {
      setForm({
        ...emptyForm,
        prazoTipo: initialPrazo ? "data_especifica" : emptyForm.prazoTipo,
        prazo: initialPrazo || "",
      });
      return;
    }

    setForm({
      titulo: editingMission.titulo || "",
      instrucao: editingMission.instrucao || "",
      prazoTipo: initialPrazoTipo(editingMission, initialPrazo),
      prazo: editingMission.prazo || initialPrazo || "",
    });
  }, [editingMission, initialPrazo]);

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
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
    const payload = {
      titulo: form.titulo.trim(),
      instrucao: form.instrucao.trim(),
      prazo: buildDeadline(),
    };

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
            name="instrucao"
            onChange={updateField}
            placeholder="Detalhe apenas se a ordem precisar de contexto"
            rows="5"
            value={form.instrucao}
          />
        </label>

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
                  onChange={updateField}
                  placeholder="DD-MM-AAAA"
                  value={form.prazo}
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
