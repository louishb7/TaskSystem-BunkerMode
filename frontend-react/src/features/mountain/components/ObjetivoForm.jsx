import React, { useEffect, useState } from "react";

const emptyForm = {
  titulo: "",
  descricao: "",
  data_alvo: "",
  sonho_id: "",
  progresso: 0,
};

export default function ObjetivoForm({
  editingObjetivo,
  loading,
  onCancel,
  onSubmit,
  sonhos,
}) {
  const [form, setForm] = useState(emptyForm);
  const isEditing = Boolean(editingObjetivo);

  useEffect(() => {
    if (!editingObjetivo) {
      setForm(emptyForm);
      return;
    }

    setForm({
      titulo: editingObjetivo.titulo || "",
      descricao: editingObjetivo.descricao || "",
      data_alvo: editingObjetivo.data_alvo || "",
      sonho_id: editingObjetivo.sonho_id ? String(editingObjetivo.sonho_id) : "",
      progresso: Number(editingObjetivo.progresso ?? 0),
    });
  }, [editingObjetivo]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === "progresso" ? Number(value) : value,
    }));
  }

  function submit(event) {
    event.preventDefault();
    onSubmit?.({
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      data_alvo: form.data_alvo || null,
      sonho_id: form.sonho_id ? Number(form.sonho_id) : null,
      progresso: Number(form.progresso),
    });
  }

  return (
    <form className="form-stack objetivo-form" onSubmit={submit}>
      <div className="form-grid">
        <label>
          Título
          <input
            name="titulo"
            onChange={updateField}
            placeholder="Ex.: Consolidar rotina de treino"
            required
            value={form.titulo}
          />
        </label>

        <label>
          Data alvo
          <input
            name="data_alvo"
            onChange={updateField}
            type="date"
            value={form.data_alvo}
          />
        </label>
      </div>

      <label>
        Sonho vinculado
        <select name="sonho_id" onChange={updateField} value={form.sonho_id}>
          <option value="">Sem sonho vinculado</option>
          {sonhos.map((sonho) => (
            <option key={sonho.id} value={sonho.id}>
              {sonho.titulo}
            </option>
          ))}
        </select>
      </label>

      <label>
        Descrição
        <textarea
          name="descricao"
          onChange={updateField}
          placeholder="Contexto opcional para orientar decisões futuras"
          rows="4"
          value={form.descricao}
        />
      </label>

      <label>
        Progresso: {form.progresso}%
        <input
          max="100"
          min="0"
          name="progresso"
          onChange={updateField}
          type="range"
          value={form.progresso}
        />
      </label>

      <div className="actions-row">
        <button className="button fire compact" disabled={loading} type="submit">
          {loading ? "AGUARDE" : isEditing ? "SALVAR OBJETIVO" : "REGISTRAR OBJETIVO"}
        </button>
        <button className="button secondary compact" disabled={loading} type="button" onClick={onCancel}>
          CANCELAR
        </button>
      </div>
    </form>
  );
}
