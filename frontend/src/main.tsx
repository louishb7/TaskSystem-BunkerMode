import React from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./app/App"
import AppErrorBoundary from "./app/AppErrorBoundary"
import { AuthProvider } from "./context/AuthContext"
import { TaskBoardProvider } from "./context/TaskBoardContext"
import "./theme/v2.css"

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <TaskBoardProvider>
            <App />
          </TaskBoardProvider>
        </AuthProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>
)
