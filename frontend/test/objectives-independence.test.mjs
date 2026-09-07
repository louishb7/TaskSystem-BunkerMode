import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import vm from "node:vm"
import ts from "typescript"

// Exercita as operações dos hooks com APIs controladas, sem servidor ou banco.
function loadHook(file, name, api, onUnauthorized = () => false) {
  const values = []
  let index = 0
  const react = {
    useState(initial) {
      const slot = index++
      if (!(slot in values)) values[slot] = initial
      return [values[slot], (value) => { values[slot] = value }]
    },
    useRef(initial) {
      const slot = index++
      values[slot] ??= { current: initial }
      return values[slot]
    },
    useCallback: (callback) => callback,
    useMemo: (callback) => callback(),
    useEffect() {},
  }
  const source = readFileSync(new URL(file, import.meta.url), "utf8")
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
  const exports = {}
  vm.runInNewContext(compiled, {
    exports,
    require(path) {
      if (path === "react") return react
      if (path.endsWith("bunkermodeApi")) return { api }
      if (path.endsWith("uiState")) return { emptyStatus: { type: "", message: "" } }
      if (path.endsWith("httpClient")) return {
        getErrorMessage: (result, fallback) => result.data?.message || fallback,
      }
      throw new Error(path)
    },
  })
  return () => {
    index = 0
    return exports[name]({ token: "test-token", onUnauthorized })
  }
}

test("Objetivos lista e executa todo CRUD sem consultar Tarefas", async () => {
  const calls = []
  const api = {
    listObjetivos: async () => {
      calls.push("list")
      return { ok: true, data: [{ id: 1, titulo: "Objetivo independente" }] }
    },
    listTasks: () => { throw new Error("Tarefas indisponível") },
  }
  for (const method of ["createObjetivo", "updateObjetivo", "updateObjetivoStatus", "reorderObjetivos", "deleteObjetivo"]) {
    api[method] = async () => {
      calls.push(method)
      return { ok: true, data: null }
    }
  }
  const render = loadHook("../src/features/objectives/hooks/useObjectives.ts", "useObjectives", api)
  assert.equal(await render().refresh(), true)
  assert.equal(render().objetivos[0].titulo, "Objetivo independente")
  for (const method of ["createObjetivo", "updateObjetivo", "updateObjetivoStatus", "reorderObjetivos", "deleteObjetivo"]) {
    assert.equal(await render()[method](1, {}), true)
    assert.equal(calls.at(-2), method)
    assert.equal(calls.at(-1), "list")
  }
})

test("integração mostra falha local e recupera tarefas agrupadas por objetivo", async () => {
  let available = false
  const render = loadHook("../src/features/objectives/hooks/useObjectiveTasks.ts", "useObjectiveTasks", {
    listTasks: async () => available
      ? { ok: true, data: [{ id: 10, objetivo_id: 1 }, { id: 11, objetivo_id: null }] }
      : { ok: false, status: 503, data: { message: "Serviço indisponível" } },
  })
  assert.equal(await render().refresh(), false)
  assert.equal(render().error, "Serviço indisponível")
  assert.equal(render().loading, false)
  available = true
  assert.equal(await render().refresh(), true)
  assert.equal(render().error, "")
  assert.equal(render().tasksByObjetivo["1"][0].id, 10)
  assert.equal(render().tasksByObjetivo["2"], undefined)
})

test("criação vinculada preserva payload e distingue persistência de falha na releitura", async () => {
  let available = false
  let received
  const render = loadHook("../src/features/objectives/hooks/useObjectiveTasks.ts", "useObjectiveTasks", {
    createTask: async (_token, payload) => {
      received = payload
      return available ? { ok: true, data: { id: 10 } }
        : { ok: false, data: { message: "Criação indisponível" } }
    },
    listTasks: async () => ({ ok: false, data: { message: "Leitura indisponível" } }),
  })
  const payload = { titulo: "Tarefa", objetivo_id: 1, duration_type: "ate_objetivo", recurrence_weekdays: [0] }
  assert.equal(await render().createTask(payload), false)
  assert.equal(render().formStatus.message, "Criação indisponível")
  available = true
  assert.equal(await render().createTask(payload), true)
  assert.equal(received, payload)
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(render().error, "Leitura indisponível")
})

test("respostas 401 da integração acionam a sessão global sem erro local", async () => {
  const unauthorizedResults = []
  const render = loadHook(
    "../src/features/objectives/hooks/useObjectiveTasks.ts",
    "useObjectiveTasks",
    {
      listTasks: async () => ({ ok: false, status: 401, data: { message: "Sessão expirada" } }),
      createTask: async () => ({ ok: false, status: 401, data: { message: "Sessão expirada" } }),
    },
    (result) => {
      unauthorizedResults.push(result)
      return result.status === 401
    },
  )

  assert.equal(await render().refresh(), false)
  assert.equal(render().error, "")
  assert.equal(await render().createTask({ titulo: "Tarefa vinculada" }), false)
  assert.equal(render().formStatus.message, "")
  assert.equal(unauthorizedResults.length, 2)
  assert.equal(unauthorizedResults.every((result) => result.status === 401), true)
})

test("resposta stale não aciona o tratamento global de sessão", async () => {
  const pendingRequests = []
  let unauthorizedCalls = 0
  const render = loadHook(
    "../src/features/objectives/hooks/useObjectiveTasks.ts",
    "useObjectiveTasks",
    {
      listTasks: () => new Promise((resolve) => pendingRequests.push(resolve)),
    },
    (result) => {
      if (result.status !== 401) return false
      unauthorizedCalls += 1
      return true
    },
  )

  const staleRequest = render().refresh()
  const currentRequest = render().refresh()
  pendingRequests[1]({ ok: true, data: [] })
  assert.equal(await currentRequest, true)
  pendingRequests[0]({ ok: false, status: 401, data: { message: "Sessão expirada" } })
  assert.equal(await staleRequest, false)
  assert.equal(unauthorizedCalls, 0)
})
