import React, { useEffect, useRef, useState } from "react"
import { NavLink } from "react-router-dom"

import Button from "../ui/Button"
import { getEnabledModules } from "../../modules/moduleCatalog"
import { APP_ROUTES } from "../../routes/routeConstants"

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",")

function NavigationLinks({ onNavigate = undefined, user }) {
  const primaryItems = [
    { key: "home", label: "Início", route: APP_ROUTES.ROOT },
    ...getEnabledModules(user),
  ]

  function renderLink(item) {
    return (
      <NavLink
        key={item.key}
        className={({ isActive }) =>
          `-ml-px flex min-h-11 items-center border-l-2 px-4 text-sm no-underline transition-colors motion-reduce:transition-none ${isActive ? "border-selection-border bg-selection font-semibold text-selection-text" : "border-transparent font-medium text-text-secondary hover:bg-surface-subtle hover:text-text-primary"}`
        }
        end={item.route === APP_ROUTES.ROOT}
        onClick={onNavigate}
        to={item.route}
      >
        {item.label}
      </NavLink>
    )
  }

  return (
    <nav aria-label="Navegação principal">
      <div className="grid border-l border-border">{primaryItems.map(renderLink)}</div>
      <div className="mt-5 grid border-l border-t border-border pt-5">
        {renderLink({
          key: "settings",
          label: "Configurações",
          route: APP_ROUTES.SETTINGS,
        })}
      </div>
    </nav>
  )
}

function SessionActions({ onLogout, user }) {
  const userName = user?.usuario || "Usuário"

  return (
    <div className="border-t border-border pt-5">
      <p className="m-0 truncate px-1 text-sm font-medium text-text-primary">{userName}</p>
      <Button className="mt-2 w-full justify-start px-1" variant="ghost" onClick={onLogout}>
        Sair
      </Button>
    </div>
  )
}

export default function AppShell({ children, onLogout, user }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const mobilePanelRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!menuOpen) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        setMenuOpen(false)
        menuButtonRef.current?.focus()
        return
      }

      if (event.key !== "Tab") {
        return
      }

      const focusableElements = Array.from(
        mobilePanelRef.current?.querySelectorAll<HTMLElement>(focusableSelector) || []
      )
      if (focusableElements.length === 0) {
        event.preventDefault()
        mobilePanelRef.current?.focus()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [menuOpen])

  function closeMenu() {
    setMenuOpen(false)
    menuButtonRef.current?.focus()
  }

  return (
    <div className="min-h-dvh bg-peripheral text-text-primary lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-peripheral lg:flex">
        <div className="flex min-h-18 items-center border-b border-border px-6">
          <span className="text-lg font-semibold tracking-tight text-accent">BunkerMode</span>
        </div>
        <div className="px-5 py-7">
          <NavigationLinks user={user} />
        </div>
        <div className="mt-auto px-5 pb-6">
          <SessionActions onLogout={onLogout} user={user} />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-border bg-peripheral px-4 lg:hidden">
        <span className="text-base font-semibold tracking-tight text-accent">BunkerMode</span>
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
        <div className="fixed inset-0 z-40 bg-backdrop lg:hidden" onMouseDown={closeMenu}>
          <aside
            ref={mobilePanelRef}
            aria-label="Navegação"
            aria-modal="true"
            className="grid h-full w-[min(304px,calc(100vw-2rem))] grid-rows-[auto_1fr_auto] border-r border-border bg-peripheral shadow-overlay"
            id="mobile-navigation"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
            tabIndex={-1}
          >
            <div className="flex min-h-16 items-center justify-between gap-4 border-b border-border px-5">
              <span className="text-base font-semibold tracking-tight text-accent">BunkerMode</span>
              <Button
                ref={closeButtonRef}
                aria-label="Fechar menu"
                size="small"
                variant="ghost"
                onClick={closeMenu}
              >
                Fechar
              </Button>
            </div>
            <div className="overflow-y-auto px-5 py-7">
              <NavigationLinks onNavigate={closeMenu} user={user} />
            </div>
            <div className="px-5 pb-6">
              <SessionActions onLogout={onLogout} user={user} />
            </div>
          </aside>
        </div>
      )}

      <main className="min-h-[calc(100dvh-4rem)] min-w-0 bg-surface px-4 py-6 sm:px-7 sm:py-9 lg:min-h-dvh lg:px-10 lg:py-10 xl:px-12">
        <div className="mx-auto w-full max-w-[1120px]">{children}</div>
      </main>
    </div>
  )
}
