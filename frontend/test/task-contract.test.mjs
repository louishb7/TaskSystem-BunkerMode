import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import vm from "node:vm"
import ts from "typescript"

const exports = {}
const source = readFileSync(new URL("../src/types/taskContract.ts", import.meta.url), "utf8")
vm.runInNewContext(
  ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  { exports }
)

const permissions = {
  can_complete: true,
  can_edit: true,
  can_delete: true,

  can_pin: true,
  can_view_history: false,
  can_reopen: false,
}

function task(overrides = {}) {
  return {
    id: 1,
    titulo: "Tarefa",
    instrucao: null,
    prioridade: 2,
    prazo: null,
    status: "PENDENTE",
    status_code: "PENDENTE",
    status_label: "Pendente",
    is_pinned: false,
    created_at: "2026-09-08T12:00:00.000Z",
    updated_at: "2026-09-08T12:00:00.000Z",
    completed_at: null,

    user_id: 1,
    criada_por_id: 1,
    responsavel_id: 1,
    objetivo_id: null,
    recurrence: null,
    permissions,
    ...overrides,
  }
}

test("contrato de Tarefa aceita somente prioridades 1, 2 e 3", () => {
  for (const prioridade of [1, 2, 3]) {
    assert.equal(exports.assertTaskContract(task({ prioridade })).prioridade, prioridade)
  }
  for (const prioridade of [0, 4, "2", null]) {
    assert.throws(() => exports.assertTaskContract(task({ prioridade })), /prioridade inválida/)
  }
})

test("contrato de Tarefa rejeita status fora do conjunto público", () => {
  assert.throws(
    () => exports.assertTaskContract(task({ status_code: "ATRASADA" })),
    /status_code inválido/
  )
})
