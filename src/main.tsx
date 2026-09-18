import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import AdminPage from "./pages/AdminPage";
import FeedbackPage from "./pages/FeedbackPage";

/* Minimal pathname router — no new dependencies.
   "/" renders the public portfolio (App, untouched).
   "/admin" renders the private testimonials panel.
   "/feedback" renders the client feedback prototype.
   Neither page is linked from the public navbar. */
function getRoute(): "admin" | "feedback" | "home" {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/admin") return "admin";
  if (path === "/feedback") return "feedback";
  return "home";
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {getRoute() === "admin" ? (
      <AdminPage />
    ) : getRoute() === "feedback" ? (
      <FeedbackPage />
    ) : (
      <App />
    )}
  </StrictMode>
);
