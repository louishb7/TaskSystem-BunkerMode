import React from "react"

import { TOKEN_KEY, USER_KEY } from "../constants/session.js"

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo })
    console.error("Erro ao montar o frontend:", error, errorInfo)
  }

  clearLocalSession = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
    window.location.reload()
  }

  render() {
    if (this.state.error) {
      return (
        <main className="boot-fallback">
          <h1>BunkerMode</h1>
          <p>O frontend carregou, mas encontrou um erro ao montar a interface.</p>
          <pre>
            {[
              this.state.error?.message,
              this.state.error?.stack,
              this.state.errorInfo?.componentStack,
            ]
              .filter(Boolean)
              .join("\n\n")}
          </pre>
          <button className="button secondary" type="button" onClick={this.clearLocalSession}>
            LIMPAR SESSÃO LOCAL E RECARREGAR
          </button>
        </main>
      )
    }

    return this.props.children
  }
}
