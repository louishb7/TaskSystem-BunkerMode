import React, { useEffect, useState } from "react"

import { getErrorMessage } from "../../../api/httpClient"
import { api } from "../../../services/bunkermodeApi"
import { formatDateForApi } from "../../../utils/date"
import { operationalDateFor } from "../../calendar/calendarUtils"

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6]
const BUSINESS_WEEKDAYS = [0, 1, 2, 3, 4]

const emptyForm = {
  titulo: "",
  instrucao: "",
  objetivo_id: "",
  prazo: "",
  repeat_type: "nao",
  recurrence_weekdays: [],
  termination_policy: "sem_termino",
  recurrence_end_date: "",
}

const MISSION_INSTRUCTION_MAX_LENGTH = 280

const weekdayOptions = [
  [0, "Seg"],
  [1, "Ter"],
  [2, "Qua"],
  [3, "Qui"],
  [4, "Sex"],
  [5, "Sáb"],
  [6, "Dom"],
]

function getUserId(user) {
  return user?.usuario_id ?? user?.id
}

function formatPrazoContext(prazo) {
  if (!prazo || typeof prazo !== "string") {
    return ""
  }

  const [day, month] = prazo.split("-")
  if (!day || !month) {
    return prazo
  }

  return `${day}/${month}`
}

function normalizeWeekdays(values: unknown): number[] {
  if (!Array.isArray(values)) {
    return []
  }
  return [...new Set(values.filter(Number.isInteger))].sort((left, right) => left - right)
}

function weekdayForDate(value) {
  const [year, month, day] = String(value).split("-").map(Number)
  if (!year || !month || !day) {
    return 0
  }
  return (new Date(year, month - 1, day).getDay() + 6) % 7
}

function defaultPrazo(initialPrazo, timezone) {
  return initialPrazo || formatDateForApi(operationalDateFor(timezone))
}

// Converte DD-MM-AAAA -> AAAA-MM-DD para o input type="date".
function toDateInputValue(prazo) {
  if (!prazo || typeof prazo !== "string") {
    return ""
  }
  const parts = prazo.split("-")
  if (parts.length !== 3) {
    return ""
  }
  if (parts[0].length === 4) {
    return prazo
  }
  const [day, month, year] = parts
  if (!day || !month || !year || year.length !== 4) {
    return ""
  }
  return `${year}-${month}-${day}`
}

// Converte AAAA-MM-DD para DD-MM-AAAA, formato esperado pela API.
function fromDateInputValue(value) {
  if (!value || typeof value !== "string") {
    return ""
  }
  const parts = value.split("-")
  if (parts.length !== 3) {
    return ""
  }
  const [year, month, day] = parts
  return `${day}-${month}-${year}`
}

function toApiDateValue(value) {
  if (!value || typeof value !== "string") {
    return ""
  }
  return value.split("-")[0]?.length === 4 ? fromDateInputValue(value) : value
}

function repeatTypeFor(weekdays, prazo) {
  const normalized = normalizeWeekdays(weekdays)
  if (normalized.length === 0) {
    return "nao"
  }
  if (normalized.join(",") === WEEKDAYS.join(",")) {
    return "todos_dias"
  }
  if (normalized.join(",") === BUSINESS_WEEKDAYS.join(",")) {
    return "dias_uteis"
  }
  if (normalized.length === 1 && normalized[0] === weekdayForDate(toDateInputValue(prazo))) {
    return "semanal"
  }
  return "personalizado"
}

function formForNewMission(initialObjetivoId, initialPrazo, timezone) {
  return {
    ...emptyForm,
    objetivo_id: initialObjetivoId ? String(initialObjetivoId) : "",
    prazo: defaultPrazo(initialPrazo, timezone),
  }
}

function formForExistingMission(mission, initialPrazo) {
  const recurrenceWeekdays = normalizeWeekdays(mission.recurrence?.weekdays)
  const prazo = toApiDateValue(mission.prazo || initialPrazo || "")

  return {
    ...emptyForm,
    titulo: mission.titulo || "",
    instrucao: mission.instrucao || "",
    objetivo_id: mission.objetivo_id ? String(mission.objetivo_id) : "",
    prazo,
    repeat_type: repeatTypeFor(recurrenceWeekdays, prazo),
    recurrence_weekdays: recurrenceWeekdays,
    termination_policy: mission.recurrence?.termination_policy || "sem_termino",
    recurrence_end_date: toApiDateValue(mission.recurrence?.end_date || ""),
  }
}

function weekdaysForRepeatType(repeatType, prazo) {
  if (repeatType === "todos_dias") {
    return WEEKDAYS
  }
  if (repeatType === "dias_uteis") {
    return BUSINESS_WEEKDAYS
  }
  if (repeatType === "semanal") {
    return [weekdayForDate(toDateInputValue(prazo))]
  }
  return []
}

export default function MissionForm({
  currentUser = null,
  editingMission = null,
  initialObjetivoId = null,
  initialObjetivoTitulo = "",
  initialPrazo = "",
  lockObjetivo = false,
  loading,
  onCancel,
  onCreate,
  onUnauthorized = undefined,
  onUpdate = undefined,
  status,
  token = null,
  timezone = undefined,
}) {
  const [form, setForm] = useState(() => formForNewMission(initialObjetivoId, initialPrazo, timezone))
  const [objetivos, setObjetivos] = useState([])
  const [objetivoStatus, setObjetivoStatus] = useState("")
  const [recurrenceError, setRecurrenceError] = useState("")

  const isEditing = Boolean(editingMission)
  const isSeriesOccurrence = Boolean(editingMission?.recurrence?.series_id)
  const isRecurring = form.repeat_type !== "nao"
  const lockedInitialPrazo = Boolean(initialPrazo && !isEditing)
  const prazoContext = formatPrazoContext(isEditing ? form.prazo : initialPrazo)

  useEffect(() => {
    if (!editingMission) {
      setForm(formForNewMission(initialObjetivoId, initialPrazo, timezone))
      return
    }

    setForm(formForExistingMission(editingMission, initialPrazo))
  }, [editingMission, initialObjetivoId, initialPrazo, timezone])

  useEffect(() => {
    async function loadObjetivos() {
      if (!token) {
        return
      }

      const result = await api.listObjetivos(token)
      if (onUnauthorized?.(result)) {
        return
      }

      if (!result.ok) {
        setObjetivoStatus(getErrorMessage(result, "Não foi possível carregar objetivos."))
        return
      }

      setObjetivos(
        (Array.isArray(result.data) ? result.data : []).filter(
          (objetivo) => objetivo.status === "ativo"
        )
      )
      setObjetivoStatus("")
    }

    loadObjetivos()
  }, [onUnauthorized, token])

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: name === "instrucao" ? value.slice(0, MISSION_INSTRUCTION_MAX_LENGTH) : value,
    }))
  }

  function handleObjetivoChange(event) {
    const objetivoId = event.target.value
    setForm((current) => ({
      ...current,
      objetivo_id: objetivoId,
      termination_policy:
        !objetivoId && current.termination_policy === "ate_objetivo"
          ? "sem_termino"
          : current.termination_policy,
    }))
  }

  function handleRepeatChange(event) {
    const repeatType = event.target.value
    setRecurrenceError("")
    setForm((current) => ({
      ...current,
      repeat_type: repeatType,
      recurrence_weekdays:
        repeatType === "personalizado"
          ? current.recurrence_weekdays
          : weekdaysForRepeatType(repeatType, current.prazo),
    }))
  }

  function handleRecurrenceEndDateChange(event) {
    setForm((current) => ({
      ...current,
      recurrence_end_date: fromDateInputValue(event.target.value),
    }))
  }

  function handlePrazoChange(event) {
    const prazo = fromDateInputValue(event.target.value)
    setForm((current) => ({
      ...current,
      prazo,
      recurrence_weekdays:
        current.repeat_type === "semanal"
          ? weekdaysForRepeatType("semanal", prazo)
          : current.recurrence_weekdays,
    }))
  }

  function toggleWeekday(weekday) {
    setRecurrenceError("")
    setForm((current) => {
      const weekdays = current.recurrence_weekdays.includes(weekday)
        ? current.recurrence_weekdays.filter((item) => item !== weekday)
        : [...current.recurrence_weekdays, weekday]
      return {
        ...current,
        repeat_type: "personalizado",
        recurrence_weekdays: normalizeWeekdays(weekdays),
      }
    })
  }

  function submit(event) {
    event.preventDefault()
    const recurrenceWeekdays = normalizeWeekdays(form.recurrence_weekdays)

    if (isRecurring && recurrenceWeekdays.length === 0) {
      setRecurrenceError("Selecione ao menos um dia para a recorrência.")
      return
    }
    if (isRecurring && form.termination_policy === "ate_data" && !form.recurrence_end_date) {
      setRecurrenceError("Informe a data final da recorrência.")
      return
    }

    const payload: {
      titulo: string
      instrucao: string
      objetivo_id?: number | null
      prazo?: string | null
    } = {
      titulo: form.titulo.trim(),
      instrucao: form.instrucao.trim(),
    }

    const objetivoId = form.objetivo_id ? Number(form.objetivo_id) : null
    if (!isEditing || objetivoId !== (editingMission?.objetivo_id ?? null)) {
      payload.objetivo_id = objetivoId
    }

    if (!isSeriesOccurrence) {
      payload.prazo = form.prazo ? form.prazo.trim() : null
    }

    // PATCH altera os dados da Ordem, nunca a configuração da recorrência.
    // A edição da Série ainda não está disponível neste formulário.
    if (!isEditing) {
      Object.assign(payload, {
        recurrence_weekdays: isRecurring ? recurrenceWeekdays : [],
        duration_type: isRecurring ? form.termination_policy : "pontual",
        recurrence_end_date:
          isRecurring && form.termination_policy === "ate_data" ? form.recurrence_end_date : null,
      })
    }

    if (isEditing) {
      onUpdate?.(editingMission.id, payload)
      return
    }

    onCreate?.({ ...payload, responsavel_id: getUserId(currentUser) })
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
        <label>
          Título
          <input
            name="titulo"
            onChange={updateField}
            placeholder="Ex.: Revisar plano semanal"
            value={form.titulo}
          />
        </label>

        {lockedInitialPrazo && (
          <div className="deadline-context">
            <span>DATA DEFINIDA</span>
            <strong>{prazoContext}</strong>
          </div>
        )}

        {isSeriesOccurrence && (
          <div className="deadline-context">
            <span>DATA DA OCORRÊNCIA</span>
            <strong>{prazoContext}</strong>
          </div>
        )}

        {!lockedInitialPrazo && !isSeriesOccurrence && (
          <label>
            Data de execução
            <input
              name="prazo"
              onChange={handlePrazoChange}
              type="date"
              value={toDateInputValue(form.prazo)}
            />
          </label>
        )}

        {lockObjetivo ? (
          <div className="deadline-context objective-context">
            <span>OBJETIVO VINCULADO</span>
            <strong>{initialObjetivoTitulo || "Objetivo selecionado"}</strong>
          </div>
        ) : (
          <label>
            Objetivo opcional
            <select name="objetivo_id" onChange={handleObjetivoChange} value={form.objetivo_id}>
              <option value="">Sem objetivo vinculado</option>
              {objetivos.map((objetivo) => (
                <option key={objetivo.id} value={objetivo.id}>
                  {objetivo.titulo}
                </option>
              ))}
            </select>
          </label>
        )}
        {objetivoStatus && <p className="feedback error">{objetivoStatus}</p>}

        <label>
          Repetir
          <select
            disabled={isEditing}
            name="repeat_type"
            onChange={handleRepeatChange}
            value={form.repeat_type}
          >
            <option value="nao">Não</option>
            <option value="todos_dias">Todos os dias</option>
            <option value="dias_uteis">Dias úteis</option>
            <option value="semanal">Semanalmente</option>
            <option value="personalizado">Personalizado</option>
          </select>
        </label>

        {isEditing && !isSeriesOccurrence && (
          <p className="muted">A recorrência é definida ao criar uma nova ordem.</p>
        )}

        {isSeriesOccurrence && (
          <p className="muted">
            Esta é uma ocorrência recorrente. As alterações serão aplicadas somente a esta ordem; a
            série não será modificada.
          </p>
        )}

        {isRecurring && !isEditing && (
          <details className="linked-mission-options" open>
            <summary>Detalhes da recorrência</summary>
            <fieldset className="weekday-fieldset">
              <legend>Dias da semana</legend>
              <div className="weekday-options">
                {weekdayOptions.map(([value, label]) => (
                  <label
                    key={value}
                    className={form.recurrence_weekdays.includes(value) ? "active" : ""}
                  >
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

            <label>
              Término
              <select
                name="termination_policy"
                onChange={updateField}
                value={form.termination_policy}
              >
                <option value="sem_termino">Sem término</option>
                <option value="ate_data">Até uma data</option>
                <option disabled={!form.objetivo_id} value="ate_objetivo">
                  Até o objetivo
                </option>
              </select>
            </label>

            {form.termination_policy === "ate_data" && (
              <label>
                Data final
                <input
                  name="recurrence_end_date"
                  onChange={handleRecurrenceEndDateChange}
                  required
                  type="date"
                  value={toDateInputValue(form.recurrence_end_date)}
                />
              </label>
            )}
          </details>
        )}
        {recurrenceError && <p className="feedback error">{recurrenceError}</p>}

        <label>
          Instrução opcional
          <textarea
            maxLength={MISSION_INSTRUCTION_MAX_LENGTH}
            name="instrucao"
            onChange={updateField}
            placeholder="Detalhe apenas se a ordem precisar de contexto"
            rows={5}
            value={form.instrucao}
          />
          <span className="field-counter">
            {form.instrucao.length}/{MISSION_INSTRUCTION_MAX_LENGTH}
          </span>
        </label>

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
  )
}
