import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import vm from "node:vm"
import ts from "typescript"

function settingsHarness(api, callbacks = {}) {
  const values = []
  let index = 0
  let effect
  let cleanup
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const slot = index++
      if (!(slot in values)) values[slot] = initial
      return [
        values[slot],
        (next) => {
          values[slot] = typeof next === "function" ? next(values[slot]) : next
        },
      ]
    },
    useRef(initial) {
      const slot = index++
      values[slot] ??= { current: initial }
      return values[slot]
    },
    useEffect(callback) {
      effect = callback
    },
  }
  const exports = {}
  const source = readFileSync(
    new URL("../src/features/settings/pages/SettingsPage.tsx", import.meta.url),
    "utf8"
  )
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
    }).outputText,
    {
      exports,
      require(path) {
        if (path === "react") return { ...react, default: react }
        if (path.endsWith("theme/preference")) return {getThemePreference: () => "system", setThemePreference: () => {}}
        if (path.endsWith("bunkermodeApi")) return { api }
        if (path.endsWith("moduleCatalog")) {
          const modules = [{ key: "tasks" }, { key: "objectives" }]
          return {
            MODULE_CATALOG: modules,
            getEnabledModules: (user) =>
              modules.filter((module) => user.enabled_modules.includes(module.key)),
          }
        }
        if (path.endsWith("uiState")) return { emptyStatus: { type: "", message: "" } }
        if (path.endsWith("httpClient")) {
          return { getErrorMessage: (result, fallback) => result.data?.message || fallback }
        }
        return { default: path }
      },
    }
  )

  const render = (props = {}) => {
    index = 0
    return exports.default({
      onUnauthorized: callbacks.onUnauthorized ?? (() => false),
      onUpdateUser: callbacks.onUpdateUser ?? (() => {}),
      token: "token",
      user: { enabled_modules: ["tasks", "objectives"] },
      ...props,
    })
  }

  function inputs(node, found = []) {
    if (!node || typeof node !== "object") return found
    if (Array.isArray(node)) {
      for (const child of node) inputs(child, found)
      return found
    }
    if (node.type === "input") found.push(node)
    for (const child of node.props?.children ?? []) inputs(child, found)
    return found
  }

  return {
    render,
    inputs: (props) => inputs(render(props)),
    state: () => ({ updatingKey: values[1], status: values[2] }),
    activate(props) {
      cleanup?.()
      render(props)
      cleanup = effect?.()
    },
    unmount() {
      cleanup?.()
    },
  }
}

test("Settings aplica somente a preferência mais nova e ignora 401 antigo", async () => {
  const pending = []
  const updatedUsers = []
  let unauthorized = 0
  const harness = settingsHarness(
    {
      updateEnabledModules: () => new Promise((resolve) => pending.push(resolve)),
    },
    {
      onUnauthorized(result) {
        if (result.status === 401) unauthorized += 1
        return result.status === 401
      },
      onUpdateUser: (user) => updatedUsers.push(user),
    }
  )

  const [tasksInput, objectivesInput] = harness.inputs()
  const oldRequest = tasksInput.props.onChange()
  const currentRequest = objectivesInput.props.onChange()
  pending[1]({ ok: true, status: 200, data: { enabled_modules: ["tasks"] } })
  await currentRequest
  pending[0]({ ok: false, status: 401, data: { message: "Sessão antiga" } })
  await oldRequest

  assert.equal(unauthorized, 0)
  assert.deepEqual(updatedUsers, [{ enabled_modules: ["tasks"] }])
  assert.equal(harness.state().updatingKey, null)
  assert.equal(harness.state().status.message, "Módulos atualizados.")
})

test("Settings ignora erro comum depois de troca de token ou desmontagem", async () => {
  let resolve
  const updatedUsers = []
  const harness = settingsHarness(
    {
      updateEnabledModules: () =>
        new Promise((done) => {
          resolve = done
        }),
    },
    { onUpdateUser: (user) => updatedUsers.push(user) }
  )
  harness.activate()
  const request = harness.inputs()[0].props.onChange()
  harness.activate({ token: "outro-token" })
  resolve({ ok: false, status: 503, data: { message: "Erro antigo" } })
  await request
  assert.deepEqual(updatedUsers, [])
  assert.equal(harness.state().status.message, "")
  harness.unmount()
})
