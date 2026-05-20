import React, { useEffect, useState } from "react";

const initialForm = {
  titulo: "",
  descricao: "",
  tipo: "secundario",
};

export default function SonhoForm({ editingSonho, loading, onCancel, onSubmit }) {
  const [form, setForm] = useState(initialForm);
  const editing = Boolean(editingSonho);

  useEffect(() => {
    if (!editingSonho) {
      setForm(initialForm);
      return;
    }
    setForm({
      titulo: editingSonho.titulo || "",
      descricao: editingSonho.descricao || "",
      tipo: editingSonho.tipo || "secundario",
    });
  }, [editingSonho]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function submit(event) {
    event.preventDefault();
    const payload = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
    };
    if (!editing) {
      payload.tipo = form.tipo;
    }
    onSubmit?.(payload);
  }

  return (
    <form className="mountain-form" onSubmit={submit}>
      <label>
        Título
        <input name="titulo" disabled={loading} required value={form.titulo} onChange={updateField} />
      </label>
      <label>
        Descrição
        <textarea name="descricao" disabled={loading} rows="4" value={form.descricao} onChange={updateField} />
      </label>
      {!editing && (
        <label>
          Tipo
          <select name="tipo" disabled={loading} value={form.tipo} onChange={updateField}>
            <option value="principal">Principal</option>
            <option value="secundario">Secundário</option>
          </select>
        </label>
      )}
      <div className="actions-row">
        <button className="button fire compact" disabled={loading} type="submit">
          {editing ? "SALVAR SONHO" : "REGISTRAR SONHO"}
        </button>
        <button className="button secondary compact" disabled={loading} type="button" onClick={onCancel}>
          CANCELAR
        </button>
      </div>
    </form>
  );
}

