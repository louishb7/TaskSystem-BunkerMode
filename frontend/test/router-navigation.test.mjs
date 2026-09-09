import assert from "node:assert/strict"
import { after, test } from "node:test"
import React, { act } from "react"
import { createRoot } from "react-dom/client"
import { MemoryRouter, useLocation } from "react-router-dom"
import { JSDOM } from "jsdom"
import { createServer } from "vite"

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
})
globalThis.window = dom.window
globalThis.document = dom.window.document

const { localStorage, sessionStorage } = dom.window

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  root: new URL("..", import.meta.url).pathname,
  server: { middlewareMode: true },
})
const [{ default: App }, { AuthProvider }] = await Promise.all([
  vite.ssrLoadModule("/src/app/App.tsx"),
  vite.ssrLoadModule("/src/context/AuthContext.tsx"),
])

after(async () => {
  await vite.close()
})

const users = {
  both: {
    id: 1,
    usuario: "tester",
    email: "tester@bunker.local",
    enabled_modules: ["tasks", "objectives"],
    timezone: "America/Recife",
    created_at: "2026-09-08T12:00:00.000Z",
    updated_at: "2026-09-08T12:00:00.000Z",
    ativo: true,
  },
  tasks: null,
  objectives: null,
  none: null,
}
users.tasks = { ...users.both, enabled_modules: ["tasks"] }
users.objectives = { ...users.both, enabled_modules: ["objectives"] }
users.none = { ...users.both, enabled_modules: [] }

const flush = () => new Promise((resolve) => setImmediate(resolve))

async function navigate(path, user = null) {
  localStorage.clear()
  sessionStorage.clear()
  const calls = []
  if (user) {
    localStorage.setItem("bunkermode_token", "router-token")
    localStorage.setItem("bunkermode_usuario", JSON.stringify({ ...user, usuario: "cache" }))
  }

  globalThis.fetch = async (url) => {
    const pathname = new URL(url).pathname
    calls.push(pathname)
    if (pathname.endsWith("/usuarios/me")) {
      return Response.json(user, { status: 200 })
    }
    if (pathname.endsWith("/tarefas/recorrencias/materializar")) {
      return new Response(null, { status: 204 })
    }
    return Response.json([], { status: 200 })
  }

  let currentPath = path
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)
  function LocationProbe() {
    currentPath = useLocation().pathname
    return null
  }

  await act(async () => {
    root.render(
      React.createElement(
        MemoryRouter,
        { initialEntries: [path] },
        React.createElement(
          AuthProvider,
          null,
          React.createElement(App),
          React.createElement(LocationProbe)
        )
      )
    )
    await flush()
    await flush()
    await flush()
  })

  const rendered = container.textContent ?? ""
  await act(async () => root.unmount())
  container.remove()
  return { calls, path: currentPath, rendered }
}

for (const path of ["/", "/tarefas", "/tarefas/foco", "/objetivos", "/configuracoes"]) {
  test(`não autenticado: ${path} redireciona para /auth`, async () => {
    const result = await navigate(path)
    assert.equal(result.path, "/auth")
    assert.match(result.rendered, /Use seus dados para continuar/)
  })
}

for (const [path, marker] of [
  ["/", "Seu Bunker"],
  ["/tarefas", "Planeje e organize suas tarefas."],
  ["/tarefas/foco", "Modo Foco"],
  ["/objetivos", "Defina o que você quer alcançar"],
  ["/configuracoes", "Escolha as ferramentas"],
]) {
  test(`autenticado com ambos: ${path} permanece acessível`, async () => {
    const result = await navigate(path, users.both)
    assert.equal(result.path, path)
    assert.match(result.rendered, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  })
}

test("Tasks desabilitado bloqueia /tarefas antes de montar TaskBoardProvider", async () => {
  for (const path of ["/tarefas", "/tarefas/foco"]) {
    const result = await navigate(path, users.objectives)
    assert.equal(result.path, "/")
    assert.equal(
      result.calls.some((call) => call.endsWith("/tarefas/recorrencias/materializar")),
      false
    )
  }
  assert.equal((await navigate("/objetivos", users.objectives)).path, "/objetivos")
})

test("Objectives desabilitado bloqueia /objetivos e mantém /tarefas", async () => {
  assert.equal((await navigate("/objetivos", users.tasks)).path, "/")
  assert.equal((await navigate("/tarefas", users.tasks)).path, "/tarefas")
})

test("com ambos desabilitados Home e Configurações permanecem acessíveis", async () => {
  assert.equal((await navigate("/", users.none)).path, "/")
  assert.equal((await navigate("/configuracoes", users.none)).path, "/configuracoes")
  assert.equal((await navigate("/tarefas", users.none)).path, "/")
  assert.equal((await navigate("/tarefas/foco", users.none)).path, "/")
  assert.equal((await navigate("/objetivos", users.none)).path, "/")
})

test("/auth autenticado redireciona para Home", async () => {
  assert.equal((await navigate("/auth", users.both)).path, "/")
})

test("rota desconhecida segue fallback genérico conforme autenticação", async () => {
  assert.equal((await navigate("/desconhecida")).path, "/auth")
  assert.equal((await navigate("/desconhecida", users.both)).path, "/")
})

test("/soldier permanece legado morto e usa exatamente o fallback genérico", async () => {
  const anonymous = await navigate("/soldier")
  const authenticated = await navigate("/soldier", users.both)
  assert.equal(anonymous.path, "/auth")
  assert.equal(authenticated.path, "/")
  assert.equal(
    authenticated.calls.some((call) => call.endsWith("/tarefas/foco")),
    false
  )
})
