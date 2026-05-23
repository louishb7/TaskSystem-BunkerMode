import React, { useEffect, useState } from "react";

const initialForm = {
  titulo: "",
  descricao: "",
  tipo: "principal",
};

export default function SonhoForm({
  editingSonho,
  hasActivePrincipal,
  initialTipo = "principal",
  loading,
  onCancel,
  onPromote,
  onRequestArchive,
  onSubmit,
}) {
  const [form, setForm] = useState(initialForm);
  const editing = Boolean(editingSonho);
  const editingSecondary = editingSonho?.tipo === "secundario";

  useEffect(() => {
    if (!editingSonho) {
      setForm({
        ...initialForm,
        tipo: hasActivePrincipal ? "secundario" : initialTipo,
      });
      return;
    }
    setForm({
      titulo: editingSonho.titulo || "",
      descricao: editingSonho.descricao || "",
      tipo: editingSonho.tipo || "secundario",
    });
  }, [editingSonho, hasActivePrincipal, initialTipo]);

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
      {!editing && !hasActivePrincipal && (
        <label>
          Tipo
          <select name="tipo" disabled={loading} value={form.tipo} onChange={updateField}>
            <option value="principal">Principal</option>
            <option value="secundario">Secundário</option>
          </select>
        </label>
      )}
      {!editing && hasActivePrincipal && (
        <p className="muted form-note">Você já possui um sonho principal ativo.</p>
      )}
      {editing && (
        <div className="edit-secondary-actions">
          {editingSecondary && (
            <>
              <p className="muted form-note">
                Para promover este sonho, o sonho principal atual precisa ser arquivado ou reduzido a secundário primeiro.
              </p>
              <button className="button secondary compact" disabled={loading} type="button" onClick={() => onPromote?.(editingSonho)}>
                PROMOVER PARA PRINCIPAL
              </button>
            </>
          )}
          <button className="button danger ghost compact" disabled={loading} type="button" onClick={() => onRequestArchive?.(editingSonho)}>
            ARQUIVAR CAMPANHA
          </button>
        </div>
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
