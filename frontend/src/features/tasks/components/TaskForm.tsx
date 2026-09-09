import React, { useEffect, useState } from "react"

import { getErrorMessage } from "../../../api/httpClient"
import Button from "../../../components/ui/Button"
import StatusNotice from "../../../components/ui/StatusNotice"
import { api } from "../../../services/bunkermodeApi"
import { getEnabledModules } from "../../../modules/moduleCatalog"
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

const TASK_INSTRUCTION_MAX_LENGTH = 280

const weekdayOptions = [
  [0, "Seg"],
  [1, "Ter"],
  [2, "Qua"],
  [3, "Qui"],
  [4, "Sex"],
  [5, "Sáb"],
  [6, "Dom"],
]

const fieldClass =
  "min-h-11 w-full rounded-control border border-control-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus-visible:border-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:bg-app disabled:text-text-secondary disabled:opacity-70"
const labelClass = "grid gap-2 text-sm font-medium normal-case text-text-primary"

function getUserId(user) {
  return user?.usuario_id ?? user?.id
}

function formatPrazoContext(prazo) {
  if (!prazo || typeof prazo !== "string") {
    return ""
  }

  const normalized = toDateInputValue(prazo)
  const [year, month, day] = normalized.split("-")
  if (!day || !month) {
    return prazo
  }

  return year ? `${day}/${month}/${year}` : `${day}/${month}`
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

function formForNewTask(initialObjetivoId, initialPrazo, timezone) {
  return {
    ...emptyForm,
    objetivo_id: initialObjetivoId ? String(initialObjetivoId) : "",
    prazo: defaultPrazo(initialPrazo, timezone),
  }
}

function formForExistingTask(task, initialPrazo) {
  const recurrenceWeekdays = normalizeWeekdays(task.recurrence?.weekdays)
  const prazo = toApiDateValue(task.prazo || initialPrazo || "")

  return {
    ...emptyForm,
    titulo: task.titulo || "",
    instrucao: task.instrucao || "",
    objetivo_id: task.objetivo_id ? String(task.objetivo_id) : "",
    prazo,
    repeat_type: repeatTypeFor(recurrenceWeekdays, prazo),
    recurrence_weekdays: recurrenceWeekdays,
    termination_policy: task.recurrence?.termination_policy || "sem_termino",
    recurrence_end_date: toApiDateValue(task.recurrence?.end_date || ""),
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

export default function TaskForm({
  currentUser = null,
  editingTask = null,
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
  const objectivesEnabled = getEnabledModules(currentUser).some(
    (module) => module.key === "objectives"
  )
  const [form, setForm] = useState(() => formForNewTask(initialObjetivoId, initialPrazo, timezone))
  const [objetivos, setObjetivos] = useState([])
  const [objetivoStatus, setObjetivoStatus] = useState("")
  const [recurrenceError, setRecurrenceError] = useState("")

  const isEditing = Boolean(editingTask)
  const isSeriesOccurrence = Boolean(editingTask?.recurrence?.series_id)
  const isRecurring = form.repeat_type !== "nao"
  const lockedInitialPrazo = Boolean(initialPrazo && !isEditing)
  const prazoContext = formatPrazoContext(isEditing ? form.prazo : initialPrazo)

  useEffect(() => {
    if (!editingTask) {
      setForm(formForNewTask(initialObjetivoId, initialPrazo, timezone))
      return
    }

    setForm(formForExistingTask(editingTask, initialPrazo))
  }, [editingTask, initialObjetivoId, initialPrazo, timezone])

  useEffect(() => {
    let active = true
    async function loadObjetivos() {
      if (!token || !objectivesEnabled) {
        return
      }

      const result = await api.listObjetivos(token)
      if (!active) return
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
    return () => {
      active = false
    }
  }, [onUnauthorized, token, objectivesEnabled])

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: name === "instrucao" ? value.slice(0, TASK_INSTRUCTION_MAX_LENGTH) : value,
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
    if (objectivesEnabled && (!isEditing || objetivoId !== (editingTask?.objetivo_id ?? null))) {
      payload.objetivo_id = objetivoId
    }

    if (!isSeriesOccurrence) {
      payload.prazo = form.prazo ? form.prazo.trim() : null
    }

    // PATCH altera os dados da tarefa, nunca a configuração da recorrência.
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
      onUpdate?.(editingTask.id, payload)
      return
    }

    onCreate?.({ ...payload, responsavel_id: getUserId(currentUser) })
  }

  return (
    <form className="grid gap-5" onSubmit={submit}>
      <label className={labelClass}>
        Título
        <input
          className={fieldClass}
          name="titulo"
          onChange={updateField}
          placeholder="Ex.: Revisar plano semanal"
          value={form.titulo}
        />
      </label>

      <label className={labelClass}>
        Instrução opcional
        <textarea
          className={`${fieldClass} min-h-28 resize-y`}
          maxLength={TASK_INSTRUCTION_MAX_LENGTH}
          name="instrucao"
          onChange={updateField}
          placeholder="Detalhe apenas se a tarefa precisar de contexto"
          rows={5}
          value={form.instrucao}
        />
        <span className="text-right text-xs text-text-secondary">
          {form.instrucao.length}/{TASK_INSTRUCTION_MAX_LENGTH}
        </span>
      </label>

      {objectivesEnabled &&
        (lockObjetivo ? (
          <div className="rounded-control border border-border bg-app p-3">
            <p className="m-0 text-sm font-medium text-text-primary">Objetivo vinculado</p>
            <p className="mt-1 mb-0 text-sm text-text-secondary">
              {initialObjetivoTitulo || "Objetivo selecionado"}
            </p>
          </div>
        ) : (
          <label className={labelClass}>
            Objetivo opcional
            <select
              className={fieldClass}
              name="objetivo_id"
              onChange={handleObjetivoChange}
              value={form.objetivo_id}
            >
              <option value="">Sem objetivo vinculado</option>
              {objetivos.map((objetivo) => (
                <option key={objetivo.id} value={objetivo.id}>
                  {objetivo.titulo}
                </option>
              ))}
            </select>
          </label>
        ))}
      {objectivesEnabled && objetivoStatus && (
        <StatusNotice status={{ type: "error", message: objetivoStatus }} />
      )}

      {lockedInitialPrazo && (
        <div className="rounded-control border border-border bg-app p-3">
          <p className="m-0 text-sm font-medium text-text-primary">Data definida</p>
          <p className="mt-1 mb-0 text-sm text-text-secondary">{prazoContext}</p>
        </div>
      )}

      {isSeriesOccurrence && (
        <div className="rounded-control border border-border bg-app p-3">
          <p className="m-0 text-sm font-medium text-text-primary">Data da ocorrência</p>
          <p className="mt-1 mb-0 text-sm text-text-secondary">{prazoContext}</p>
          <p className="mt-2 mb-0 text-sm text-text-secondary">
            Esta data pertence à série recorrente.
          </p>
        </div>
      )}

      {!lockedInitialPrazo && !isSeriesOccurrence && (
        <label className={labelClass}>
          Data de execução
          <input
            className={fieldClass}
            name="prazo"
            onChange={handlePrazoChange}
            type="date"
            value={toDateInputValue(form.prazo)}
          />
        </label>
      )}

      <section
        className="grid gap-4 rounded-card border border-border p-4"
        aria-labelledby="recorrencia-title"
      >
        <div>
          <h3
            id="recorrencia-title"
            className="m-0 text-base font-semibold normal-case text-text-primary"
          >
            Recorrência
          </h3>
          {isEditing && !isSeriesOccurrence && (
            <p className="mt-1 mb-0 text-sm text-text-secondary">
              A recorrência é definida ao criar uma nova tarefa.
            </p>
          )}
          {isSeriesOccurrence && (
            <p className="mt-1 mb-0 text-sm text-text-secondary">
              As alterações serão aplicadas somente a esta tarefa; a série não será modificada.
            </p>
          )}
        </div>
        <label className={labelClass}>
          Repetir
          <select
            className={fieldClass}
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

        {isRecurring && !isEditing && (
          <details className="grid gap-4" open>
            <summary className="cursor-pointer text-sm font-medium text-text-primary">
              Detalhes da recorrência
            </summary>
            <div className="grid gap-4">
              <fieldset className="m-0 border-0 p-0">
                <legend className="mb-2 text-sm font-medium text-text-primary">
                  Dias da semana
                </legend>
                <div className="flex flex-wrap gap-2">
                  {weekdayOptions.map(([value, label]) => (
                    <label
                      key={value}
                      className={`inline-flex min-h-11 items-center gap-2 rounded-control border px-3 text-sm font-medium normal-case ${form.recurrence_weekdays.includes(value) ? "border-selection-border bg-selection text-selection-text" : "border-control-border bg-surface text-text-secondary"}`}
                    >
                      <input
                        checked={form.recurrence_weekdays.includes(value)}
                        className="size-5 min-h-0 w-5 accent-selection-border"
                        onChange={() => toggleWeekday(value)}
                        type="checkbox"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className={labelClass}>
                Término
                <select
                  className={fieldClass}
                  name="termination_policy"
                  onChange={updateField}
                  value={form.termination_policy}
                >
                  <option value="sem_termino">Sem término</option>
                  <option value="ate_data">Até uma data</option>
                  {objectivesEnabled && (
                    <option disabled={!form.objetivo_id} value="ate_objetivo">
                      Até o objetivo
                    </option>
                  )}
                </select>
              </label>

              {form.termination_policy === "ate_data" && (
                <label className={labelClass}>
                  Data final
                  <input
                    className={fieldClass}
                    name="recurrence_end_date"
                    onChange={handleRecurrenceEndDateChange}
                    required
                    type="date"
                    value={toDateInputValue(form.recurrence_end_date)}
                  />
                </label>
              )}
            </div>
          </details>
        )}
      </section>
      {recurrenceError && <StatusNotice status={{ type: "error", message: recurrenceError }} />}

      <StatusNotice status={status} />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button disabled={loading} variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button loading={loading} type="submit">
          {isEditing ? "Salvar edição" : "Registrar tarefa"}
        </Button>
      </div>
    </form>
  )
}
