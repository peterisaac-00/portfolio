import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import AdminPage from "./pages/AdminPage";

/* Minimal pathname router — no new dependencies.
   "/" renders the public portfolio (App, untouched).
   "/admin" renders the private testimonials panel.
   /admin is intentionally NOT linked from the public navbar. */
function isAdminPath(): boolean {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  return path === "/admin";
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>{isAdminPath() ? <AdminPage /> : <App />}</StrictMode>
);
