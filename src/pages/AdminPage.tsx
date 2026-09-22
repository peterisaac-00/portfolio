import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Footer from "../components/Footer";
import {
  acquireLocalAdminSession,
  fetchTestimonials,
  formatDate,
  updateTestimonialStatus,
  type Testimonial,
  type TestimonialStatus,
} from "../lib/testimonials";

/* ────────────────────────────────────────────
   /admin — private testimonials control panel.
   Deliberately reuses the portfolio's existing tokens:
   max-w-5xl mx-auto px-6, "// ..." font-mono labels,
   rounded-full pills, rounded-2xl bordered cards,
   green-600 primary + green-200 secondary buttons.
   No sidebar, no charts, no dashboard chrome.
   NOT linked from the public navbar.
   ──────────────────────────────────────────── */

type Tab = TestimonialStatus;

const TABS: Tab[] = ["pending", "approved", "rejected"];

function Stars({ value, label }: { value: number; label: string }) {
  const safe = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span
      className="text-sm leading-none tracking-[0.15em]"
      role="img"
      aria-label={`${label}: ${safe} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={i < safe ? "text-green-500 dark:text-green-400" : "text-gray-200 dark:text-gray-700"}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function StatusBadge({ status }: { status: TestimonialStatus }) {
  const styles =
    status === "approved"
      ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-gray-900 border-green-100 dark:border-green-900"
      : status === "pending"
        ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-900"
        : "text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-800";
  return (
    <span
      className={`inline-flex items-center text-[11px] font-mono uppercase tracking-widest px-3 py-1 rounded-full border ${styles}`}
    >
      {status}
    </span>
  );
}

export default function AdminPage() {
  const adminCtx = useMemo(() => acquireLocalAdminSession(), []);
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("pending");
  const [confirm, setConfirm] = useState<{
    id: string;
    action: "reject";
  } | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTestimonials();
      setItems(data);
    } catch {
      setError("Couldn't load testimonials. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch: setState only inside the async callbacks below
  // (event-handler `load` above is used for Retry).
  useEffect(() => {
    const prev = document.title;
    document.title = "Admin";
    let cancelled = false;
    fetchTestimonials()
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        if (!cancelled)
          setError("Couldn't load testimonials. Check your connection and try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      document.title = prev;
    };
  }, []);

  const counts = useMemo(
    () => ({
      pending: items.filter((t) => t.status === "pending").length,
      approved: items.filter((t) => t.status === "approved").length,
      rejected: items.filter((t) => t.status === "rejected").length,
    }),
    [items]
  );

  const visible = useMemo(
    () =>
      [...items]
        .filter((t) => t.status === tab)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [items, tab]
  );

  const runStatusChange = async (
    id: string,
    next: TestimonialStatus
  ) => {
    setActionId(id);
    setActionError(null);
    try {
      // ADMIN WRITE: in production this must hit a backend endpoint
      // that verifies the admin session server-side.
      const updated = await updateTestimonialStatus(id, next, adminCtx);
      setItems((prev) =>
        prev.map((t) => (t.id === id ? updated : t))
      );
      setConfirm(null);
    } catch {
      setActionError("Couldn't save that change. Please try again.");
    } finally {
      setActionId(null);
    }
  };

  const emptyCopy: Record<Tab, { title: string; sub: string }> = {
    pending: {
      title: "No pending testimonials",
      sub: "New client feedback will appear here for review.",
    },
    approved: {
      title: "No approved testimonials",
      sub: "Approved feedback will appear here and become public.",
    },
    rejected: {
      title: "No rejected testimonials",
      sub: "Rejected feedback will appear here.",
    },
  };

  return (
    <main className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 antialiased min-h-screen">
      <div className="max-w-5xl mx-auto px-6 pt-8 pb-20">
        {/* Minimal top row — back link + logo mark (not the public navbar) */}
        <div className="flex items-center justify-between mb-10">
          <a
            href="/"
            className="text-xs font-mono text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
          >
            ← Back to portfolio
          </a>
          <a href="/" className="font-mono text-lg tracking-tight">
            <span className="text-green-500 dark:text-green-400">{"<"}</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">Peter</span>
            <span className="text-green-500 dark:text-green-400">{" />"}</span>
          </a>
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8"
        >
          <div>
            <p className="text-xs font-mono text-green-500 dark:text-green-400 tracking-widest uppercase mb-2">
              {"// admin"}
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Testimonials Admin
            </h1>
            <p className="text-gray-400 text-[15px] leading-relaxed">
              Review and manage client feedback.
            </p>
          </div>
          <span
            className="inline-flex self-start sm:self-auto items-center text-xs font-mono text-green-700 dark:text-green-400 bg-green-50 dark:bg-gray-900 px-3 py-1.5 rounded-full border border-green-100 dark:border-green-900"
            aria-live="polite"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400 mr-2" />
            {counts.pending} Pending
          </span>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-wrap gap-2.5 mb-4"
          role="tablist"
          aria-label="Testimonial status"
        >
          {TABS.map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setTab(t);
                  setConfirm(null);
                  setActionError(null);
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-300 capitalize ${
                  active
                    ? "bg-green-600 dark:bg-green-600 text-white border-green-600 shadow-lg shadow-green-600/20"
                    : "bg-white dark:bg-gray-950 text-gray-600 dark:text-gray-400 border-green-200 dark:border-green-900 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-400"
                }`}
              >
                {t}{" "}
                <span
                  className={`font-mono text-xs ${active ? "text-green-100" : "text-gray-400"}`}
                >
                  ({counts[t]})
                </span>
              </button>
            );
          })}
        </motion.div>

        {actionError && (
          <p className="text-xs font-mono text-red-500 dark:text-red-400 mb-4" role="alert">
            {"// "}
            {actionError}
          </p>
        )}

        {/* Body states */}
        {loading ? (
          <div className="space-y-4" aria-label="Loading testimonials">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="p-5 rounded-2xl bg-white dark:bg-gray-950 border border-green-100/80 dark:border-green-900 animate-pulse"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-gray-800" />
                  <div className="flex-1">
                    <div className="h-3 w-32 rounded bg-gray-100 dark:bg-gray-800 mb-2" />
                    <div className="h-2.5 w-24 rounded bg-gray-50 dark:bg-gray-800" />
                  </div>
                </div>
                <div className="h-2.5 w-full rounded bg-gray-50 dark:bg-gray-800 mb-2" />
                <div className="h-2.5 w-3/4 rounded bg-gray-50 dark:bg-gray-800" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-gray-950 border border-green-100/80 dark:border-green-900 text-center">
            <p className="text-xs font-mono text-green-500 dark:text-green-400 tracking-widest uppercase mb-2">
              {"// error"}
            </p>
            <p className="text-gray-900 dark:text-gray-100 font-semibold mb-2">
              Couldn't load testimonials
            </p>
            <p className="text-gray-400 text-sm mb-6">{error}</p>
            <button
              onClick={() => void load()}
              className="px-5 py-2.5 rounded-full border border-green-200 dark:border-green-900 text-green-700 dark:text-green-400 text-sm font-semibold hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors duration-300"
            >
              Try again
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="p-12 rounded-2xl bg-white dark:bg-gray-950 border border-green-100/80 dark:border-green-900 text-center">
            <p className="text-xs font-mono text-green-500 dark:text-green-400 tracking-widest uppercase mb-2">
              {"// " + tab}
            </p>
            <p className="text-gray-900 dark:text-gray-100 font-semibold mb-2">
              {emptyCopy[tab].title}
            </p>
            <p className="text-gray-400 text-sm">{emptyCopy[tab].sub}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((t, i) => {
              const isActing = actionId === t.id;
              const isConfirming = confirm?.id === t.id;
              return (
                <motion.article
                  key={t.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: Math.min(i * 0.06, 0.3) }}
                  className="p-5 rounded-2xl bg-white dark:bg-gray-950 shadow-sm border border-green-100/80 dark:border-green-900 hover:shadow-md transition-all duration-300"
                >
                  {/* Identity */}
                  <div className="flex flex-wrap items-center gap-3 mb-5">
                    <span className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-700 dark:text-green-400 font-mono text-xs font-bold shrink-0">
                      {t.avatar}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-gray-100 font-semibold text-[15px] leading-tight truncate">
                        {t.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {[t.company, formatDate(t.createdAt)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>

                  {/* Ratings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mb-5">
                    {[
                      { label: "Overall Experience", value: t.overallRating },
                      { label: "Professionalism", value: t.professionalismRating },
                      { label: "Work Quality", value: t.qualityRating },
                      { label: "Communication", value: t.communicationRating },
                    ].map((r) => (
                      <div
                        key={r.label}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="text-[11px] font-mono text-gray-400 uppercase tracking-widest">
                          {r.label}
                        </span>
                        <Stars value={r.value} label={r.label} />
                      </div>
                    ))}
                  </div>

                  {/* Feedback */}
                  <p className="text-[11px] font-mono text-gray-400 uppercase tracking-widest mb-2">
                    Client Feedback
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-[15px] leading-relaxed mb-2">
                    {t.message}
                  </p>
                  <p className="text-xs font-mono text-gray-300 mb-5">
                    {t.recommend
                      ? "✓ Recommends working together"
                      : "○ Did not recommend"}
                  </p>

                  {/* Actions */}
                  {t.status === "pending" && !isConfirming && (
                    <div className="flex flex-wrap gap-3">
                      <button
                        disabled={isActing}
                        onClick={() => void runStatusChange(t.id, "approved")}
                        className="px-5 py-2.5 rounded-full bg-green-600 dark:bg-green-600 text-white text-sm font-semibold hover:bg-green-700 dark:hover:bg-green-700 transition-colors duration-300 shadow-lg shadow-green-600/20 disabled:opacity-50"
                      >
                        {isActing ? "Approving…" : "Approve"}
                      </button>
                      <button
                        disabled={isActing}
                        onClick={() =>
                          setConfirm({ id: t.id, action: "reject" })
                        }
                        className="px-5 py-2.5 rounded-full border border-green-200 dark:border-green-900 text-green-700 dark:text-green-400 text-sm font-semibold hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors duration-300 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {t.status === "approved" && !isConfirming && (
                    <div className="flex flex-wrap gap-3">
                      <button
                        disabled={isActing}
                        onClick={() => void runStatusChange(t.id, "rejected")}
                        className="px-5 py-2.5 rounded-full border border-green-200 dark:border-green-900 text-green-700 dark:text-green-400 text-sm font-semibold hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors duration-300 disabled:opacity-50"
                      >
                        {isActing ? "Working…" : "Unpublish"}
                      </button>
                    </div>
                  )}

                  {t.status === "rejected" && !isConfirming && tab === "rejected" && (
                    <p className="text-xs font-mono text-gray-300">
                      {"// rejected — hidden from the public portfolio"}
                    </p>
                  )}

                  {/* Inline confirmation (small, not a big modal) */}
                  {isConfirming && confirm && (
                    <div className="mt-1 p-4 rounded-xl bg-green-50/60 dark:bg-gray-900 border border-green-100 dark:border-green-900">
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-3">
                        {confirm.action === "reject" &&
                          "Reject this testimonial?"}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => setConfirm(null)}
                          disabled={isActing}
                          className="px-5 py-2 rounded-full border border-green-200 dark:border-green-900 text-green-700 dark:text-green-400 text-sm font-semibold hover:bg-white dark:hover:bg-gray-800 transition-colors duration-300 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        {confirm.action === "reject" && (
                          <button
                            onClick={() => void runStatusChange(t.id, "rejected")}
                            disabled={isActing}
                            className="px-5 py-2 rounded-full bg-gray-900 dark:bg-gray-700 text-white text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors duration-300 disabled:opacity-50"
                          >
                            {isActing ? "Rejecting…" : "Reject"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </motion.article>
              );
            })}
          </div>
        )}

        <p className="mt-10 text-center text-xs font-mono text-gray-300">
          {"/* private — admin actions require server authorization in production */"}
        </p>
      </div>
      <Footer />
    </main>
  );
}
