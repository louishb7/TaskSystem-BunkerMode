import React, { useEffect, useState } from "react"

const emptyForm = {
  titulo: "",
  descricao: "",
  data_alvo: "",
  sem_prazo: true,
}

export default function ObjetivoForm({
  editingObjetivo,
  initialSonhoId = null,
  loading,
  onCancel,
  onSubmit,
}) {
  const [form, setForm] = useState(emptyForm)
  const isEditing = Boolean(editingObjetivo)

  useEffect(() => {
    if (!editingObjetivo) {
      setForm(emptyForm)
      return
    }

    setForm({
      titulo: editingObjetivo.titulo || "",
      descricao: editingObjetivo.descricao || "",
      data_alvo: editingObjetivo.data_alvo || "",
      sem_prazo: !editingObjetivo.data_alvo,
    })
  }, [editingObjetivo])

  function updateField(event) {
    const { checked, name, type, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  function submit(event) {
    event.preventDefault()
    onSubmit?.({
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || null,
      data_alvo: form.sem_prazo ? null : form.data_alvo || null,
      sonho_id: isEditing ? (editingObjetivo.sonho_id ?? null) : initialSonhoId,
    })
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

        <div className="date-target-field">
          <label className="toggle-row checkbox-row">
            <input
              checked={form.sem_prazo}
              name="sem_prazo"
              onChange={updateField}
              type="checkbox"
            />
            Até conseguir
          </label>
          {!form.sem_prazo && (
            <label>
              Data alvo
              <input name="data_alvo" onChange={updateField} type="date" value={form.data_alvo} />
            </label>
          )}
        </div>
      </div>

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

      <div className="actions-row">
        <button className="button fire compact" disabled={loading} type="submit">
          {loading ? "AGUARDE" : isEditing ? "SALVAR OBJETIVO" : "REGISTRAR OBJETIVO"}
        </button>
        <button
          className="button secondary compact"
          disabled={loading}
          type="button"
          onClick={onCancel}
        >
          CANCELAR
        </button>
      </div>
    </form>
  )
}
