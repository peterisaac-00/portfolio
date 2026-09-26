import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

/* Route-based code splitting: each route loads only its own
   chunk, so visiting /feedback never downloads/parses the
   large App/Admin bundles before the entrance animation. */
const App = lazy(() => import("./App"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const FeedbackPage = lazy(() => import("./pages/FeedbackPage"));

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
    {/* Invisible fallback so the entrance animation is the first
        thing perceived, not a spinner. */}
    <Suspense fallback={null}>
      {getRoute() === "admin" ? (
        <AdminPage />
      ) : getRoute() === "feedback" ? (
        <FeedbackPage />
      ) : (
        <App />
      )}
    </Suspense>
  </StrictMode>
);
