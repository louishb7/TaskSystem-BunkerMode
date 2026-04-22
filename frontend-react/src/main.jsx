import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("Erro ao montar o frontend:", error, errorInfo);
  }

  clearLocalSession = () => {
    localStorage.removeItem("bunkermode_token");
    localStorage.removeItem("bunkermode_usuario");
    window.location.reload();
  };

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
          <button className="button primary" type="button" onClick={this.clearLocalSession}>
            Limpar sessão local e recarregar
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
