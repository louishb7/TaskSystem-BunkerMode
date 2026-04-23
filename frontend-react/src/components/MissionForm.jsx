import { useEffect, useState } from "react";
import { formatDateForApi, getTomorrow } from "../utils/date.js";

const emptyForm = {
  titulo: "",
  instrucao: "",
  prioridade: "1",
  prazoTipo: "hoje",
  prazo: "",
};

function getUserId(user) {
  return user?.usuario_id ?? user?.id;
}

export default function MissionForm({
  editingMission,
  currentUser,
  loading,
  status,
  onCreate,
  onUpdate,
  onCancelEdit,
}) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!editingMission) {
      setForm(emptyForm);
      return;
    }

    setForm({
      titulo: editingMission.titulo || "",
      instrucao: editingMission.instrucao || "",
      prioridade: String(editingMission.prioridade || 1),
      prazoTipo: editingMission.prazo ? "data_especifica" : "hoje",
      prazo: editingMission.prazo || "",
    });
  }, [editingMission]);

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
      prioridade: Number(form.prioridade),
      prazo: buildDeadline(),
    };

    if (!editingMission) {
      payload.responsavel_id = getUserId(currentUser);
      onCreate(payload);
      return;
    }

    onUpdate(editingMission.id, payload);
  }

  function clearForm() {
    setForm(emptyForm);
    if (editingMission) {
      onCancelEdit();
    }
  }

  const isEditing = Boolean(editingMission);

  return (
    <section className={`panel mission-form ${isEditing ? "editing" : ""}`}>
      <div className="section-heading">
        <div>
          <h2>{isEditing ? "Editar missão" : "Criar missão"}</h2>
          <p className="muted">
            {isEditing
              ? `Atualizando missão ${editingMission.id}.`
              : "Defina uma missão clara para execução."}
          </p>
        </div>
      </div>

      <form className="form-stack" onSubmit={submit}>
        <label>
          Título
          <input
            name="titulo"
            value={form.titulo}
            onChange={updateField}
            placeholder="Ex.: Revisar plano semanal"
          />
        </label>

        <label>
          Instrução
          <textarea
            name="instrucao"
            rows="5"
            value={form.instrucao}
            onChange={updateField}
            placeholder="Descreva exatamente o que deve ser feito"
          />
        </label>

        <div className="form-grid">
          <label>
            Prazo
            <select name="prazoTipo" value={form.prazoTipo} onChange={updateField}>
              <option value="hoje">Hoje</option>
              <option value="amanha">Amanhã</option>
              <option value="data_especifica">Data específica</option>
            </select>
          </label>

          {form.prazoTipo === "data_especifica" && (
            <label>
              Data
              <input
                name="prazo"
                value={form.prazo}
                onChange={updateField}
                placeholder="DD-MM-YYYY"
              />
            </label>
          )}

          <label>
            Prioridade
            <select name="prioridade" value={form.prioridade} onChange={updateField}>
              <option value="1">Alta</option>
              <option value="2">Média</option>
              <option value="3">Baixa</option>
            </select>
          </label>
        </div>

        {status.message && (
          <p className={`feedback ${status.type}`}>{status.message}</p>
        )}

        <div className="actions-row">
          <button className="button primary" type="submit" disabled={loading}>
            {loading ? "Salvando..." : isEditing ? "Salvar edição" : "Criar missão"}
          </button>
          <button className="button secondary" type="button" onClick={clearForm}>
            {isEditing ? "Cancelar edição" : "Limpar"}
          </button>
        </div>
      </form>
    </section>
  );
}
