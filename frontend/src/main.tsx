import React from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./app/App"
import AppErrorBoundary from "./app/AppErrorBoundary"
import { AuthProvider } from "./context/AuthContext"
import { MissionBoardProvider } from "./context/MissionBoardContext"
import "./theme/tokens.css"
import "./styles.css"

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <MissionBoardProvider>
            <App />
          </MissionBoardProvider>
        </AuthProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>
)
