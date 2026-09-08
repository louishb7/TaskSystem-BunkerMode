import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import vm from "node:vm"
import ts from "typescript"

function formHarness(api) {
  const values = []
  let index = 0
  let effects = []
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const slot = index++
      if (!(slot in values)) values[slot] = typeof initial === "function" ? initial() : initial
      return [values[slot], (next) => { values[slot] = typeof next === "function" ? next(values[slot]) : next }]
    },
    useEffect(callback) { effects.push(callback) },
  }
  const exports = {}
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/features/tasks/components/TaskForm.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText, {
    exports,
    require(path) {
      if (path === "react") return { ...react, default: react }
      if (path.endsWith("bunkermodeApi")) return { api }
      if (path.endsWith("moduleCatalog")) return { getEnabledModules: (user) => (user.enabled_modules ?? ["tasks", "objectives"]).map((key) => ({ key })) }
      if (path.endsWith("httpClient")) return { getErrorMessage: (_r, fallback) => fallback }
      if (path.endsWith("/date")) return { formatDateForApi: () => "01-09-2026" }
      if (path.endsWith("calendarUtils")) return { operationalDateFor: () => new Date() }
      return { default: path }
    },
  })
  return (props) => {
    index = 0
    effects = []
    const tree = exports.default({ token: "token", ...props })
    return { tree, effects: () => effects.forEach((effect) => effect()) }
  }
}

test("formulário sem Objetivos não consulta a API nem altera vínculo existente", async () => {
  const render = formHarness({ listObjetivos: () => { throw new Error("Consulta indevida") } })
  let payload
  const props = {
    currentUser: { enabled_modules: ["tasks"] },
    editingTask: { id: 10, titulo: "Tarefa", objetivo_id: 7 },
    onUpdate: (_id, data) => { payload = data },
  }
  render(props).effects()
  const { tree } = render(props)
  tree.props.onSubmit({ preventDefault() {} })
  assert.equal(Object.hasOwn(payload, "objetivo_id"), false)
  assert.equal(JSON.stringify(tree).includes("Objetivo opcional"), false)
  assert.equal(props.editingTask.objetivo_id, 7)
})

test("ambos habilitados mantêm consulta e criação vinculada", async () => {
  let reads = 0
  let payload
  const render = formHarness({ listObjetivos: async () => { reads++; return { ok: true, data: [] } } })
  const props = { currentUser: { enabled_modules: ["tasks", "objectives"] }, initialObjetivoId: 7, onCreate: (data) => { payload = data } }
  render(props).effects()
  const { tree } = render(props)
  tree.props.onSubmit({ preventDefault() {} })
  assert.equal(reads, 1)
  assert.equal(payload.objetivo_id, 7)
  assert.equal(JSON.stringify(tree).includes("Objetivo opcional"), true)
})
