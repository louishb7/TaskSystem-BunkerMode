export type ThemePreference = "system" | "light" | "dark"
export function getThemePreference(): ThemePreference {
  try {
    const value = window.localStorage.getItem("bunkermode_theme")
    return value === "light" || value === "dark" ? value : "system"
  } catch {
    return "system"
  }
}
export function setThemePreference(value: ThemePreference) {
  if (value === "system") document.documentElement.removeAttribute("data-theme")
  else document.documentElement.dataset.theme = value
  try {
    window.localStorage.setItem("bunkermode_theme", value)
  } catch {
    /* A preferência continua válida nesta página. */
  }
}
