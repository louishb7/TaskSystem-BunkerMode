import React, { useEffect, useRef, useState } from "react"
import { NavLink } from "react-router-dom"

import Button from "../ui/Button"
import { getEnabledModules } from "../../modules/moduleCatalog"
import { APP_ROUTES } from "../../routes/routeConstants"

function NavigationLinks({ onNavigate = undefined, user }) {
  const navigationItems = [
    { key: "home", label: "Início", route: APP_ROUTES.ROOT },
    ...getEnabledModules(user),
    { key: "settings", label: "Configurações", route: APP_ROUTES.SETTINGS },
  ]

  return (
    <nav aria-label="Navegação principal" className="grid gap-1">
      {navigationItems.map((item) => (
        <NavLink
          key={item.key}
          className={({ isActive }) =>
            `flex min-h-11 items-center rounded-control border-l-4 px-3 text-sm font-medium transition-colors ${isActive ? "border-accent bg-accent-soft text-text-primary" : "border-transparent text-text-secondary hover:bg-app hover:text-text-primary"}`
          }
          end={item.route === APP_ROUTES.ROOT}
          onClick={onNavigate}
          to={item.route}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

function SessionActions({ onLogout, user }) {
  const userName = user?.usuario || "Usuário"

  return (
    <div className="border-t border-border pt-4">
      <p className="m-0 truncate text-sm font-medium text-text-primary">{userName}</p>
      <Button className="mt-3 w-full" variant="ghost" onClick={onLogout}>
        Sair
      </Button>
    </div>
  )
}

export default function AppShell({ children, onLogout, user }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement | null>(null)
  const mobilePanelRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!menuOpen) {
      return undefined
    }

    const firstLink = mobilePanelRef.current?.querySelector<HTMLElement>("a[href]")
    firstLink?.focus()

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }

    document.addEventListener("keydown", closeOnEscape)
    return () => document.removeEventListener("keydown", closeOnEscape)
  }, [menuOpen])

  function closeMenu() {
    setMenuOpen(false)
    menuButtonRef.current?.focus()
  }

  return (
    <div className="min-h-dvh bg-app text-text-primary lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-sidebar p-5 lg:flex">
        <span className="text-lg font-semibold tracking-tight">BunkerMode</span>
        <div className="mt-8">
          <NavigationLinks user={user} />
        </div>
        <div className="mt-auto">
          <SessionActions onLogout={onLogout} user={user} />
        </div>
      </aside>

      <header className="flex h-14 items-center justify-between border-b border-border bg-sidebar px-4 lg:hidden">
        <span className="text-base font-semibold tracking-tight">BunkerMode</span>
        <Button
          ref={menuButtonRef}
          aria-controls="mobile-navigation"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          size="small"
          variant="ghost"
          onClick={() => setMenuOpen((current) => !current)}
        >
          Menu
        </Button>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/35 lg:hidden" onMouseDown={closeMenu}>
          <aside
            ref={mobilePanelRef}
            aria-label="Menu"
            className="grid h-full w-[min(280px,calc(100vw-2rem))] grid-rows-[auto_1fr_auto] bg-sidebar p-5 shadow-xl"
            id="mobile-navigation"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <span className="text-lg font-semibold tracking-tight">BunkerMode</span>
            <div className="mt-8">
              <NavigationLinks onNavigate={closeMenu} user={user} />
            </div>
            <SessionActions onLogout={onLogout} user={user} />
          </aside>
        </div>
      )}

      <main className="min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto w-full max-w-[1120px]">{children}</div>
      </main>
    </div>
  )
}
