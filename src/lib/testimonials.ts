/* ────────────────────────────────────────────
   TESTIMONIALS DATA LAYER
   No backend exists in this project yet (Vite + React SPA,
   no API routes, no DB, no auth). This file is the single
   source of truth for the testimonial shape so the feedback
   page, the public portfolio, and /admin all share one model
   instead of drifting into duplicates.

   STORAGE: submissions from /feedback are persisted to
   localStorage, so they survive reloads and appear on /admin
   (plain <a> navigation between routes is a full page load,
   which is why an in-memory store alone would lose them).
   New entries always start as "pending" for admin review.
   Swap the functions below for real API calls once a backend
   exists.

   SECURITY — read before wiring a real backend:
   - There is NO auth in this repo. The `updateTestimonialStatus`
     function below is a FRONTEND-ONLY stand-in so the /admin UI
     can be built and reviewed. It is NOT a security boundary.
   - In production, approve/reject/unpublish MUST be a backend
     endpoint (e.g. POST /api/testimonials/:id/status) that
     verifies an HttpOnly session cookie / server-side role
     check. The frontend must never decide authorization.
   - NEVER put admin passwords, secret keys, API keys, or DB
     credentials in frontend code. This file contains none —
     the "admin session" below is only a local UI flag, not a
     credential, and must be replaced by real server auth.
   ──────────────────────────────────────────── */

export type TestimonialStatus = "pending" | "approved" | "rejected";

export interface Testimonial {
  id: string;
  name: string;
  company?: string;
  /** Initials (e.g. "WA"). Rendered as a local circle avatar so no
      external image host is needed (index.html CSP only allows
      img-src 'self' data:). */
  avatar: string;
  overallRating: number;
  professionalismRating: number;
  qualityRating: number;
  communicationRating: number;
  recommend: boolean;
  message: string;
  status: TestimonialStatus;
  createdAt: string; // ISO date string
}

/** Input accepted from the /feedback form (no id/status — those are
    assigned here so every entry starts as "pending"). */
export interface NewTestimonialInput {
  name: string;
  company?: string;
  overallRating: number;
  professionalismRating: number;
  qualityRating: number;
  communicationRating: number;
  recommend: boolean;
  message: string;
}

/* localStorage-backed store. Starts empty — no dummy data.
   Every mutation persists, every read re-loads (cheap, and keeps
   separate tabs/routes in sync). Falls back to memory only when
   storage is unavailable (e.g. private mode). */
const STORAGE_KEY = "portfolio.testimonials.v1";

function isTestimonial(v: unknown): v is Testimonial {
  if (typeof v !== "object" || v === null) return false;
  const t = v as Record<string, unknown>;
  return (
    typeof t.id === "string" &&
    typeof t.name === "string" &&
    typeof t.message === "string" &&
    (t.status === "pending" ||
      t.status === "approved" ||
      t.status === "rejected") &&
    typeof t.overallRating === "number" &&
    typeof t.professionalismRating === "number" &&
    typeof t.qualityRating === "number" &&
    typeof t.communicationRating === "number" &&
    typeof t.recommend === "boolean" &&
    typeof t.createdAt === "string" &&
    typeof t.avatar === "string"
  );
}

function loadStore(): Testimonial[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isTestimonial);
  } catch {
    return [];
  }
}

let store: Testimonial[] = loadStore();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* Storage unavailable — entries live in memory for this page
       load only. */
  }
}

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

/** Public read — used by /admin (and any future public section). */
export async function fetchTestimonials(): Promise<Testimonial[]> {
  await delay(450); // simulate network
  store = loadStore();
  return store.map((t) => ({ ...t }));
}

/** Public write — used by /feedback. Always starts as "pending". */
export async function submitTestimonial(
  input: NewTestimonialInput
): Promise<Testimonial> {
  await delay(450); // simulate network
  const name = input.name.trim();
  const item: Testimonial = {
    id: `t-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    name,
    company: input.company?.trim() || undefined,
    avatar: initials(name),
    overallRating: input.overallRating,
    professionalismRating: input.professionalismRating,
    qualityRating: input.qualityRating,
    communicationRating: input.communicationRating,
    recommend: input.recommend,
    message: input.message.trim(),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  store = loadStore();
  store = [item, ...store];
  persist();
  return { ...item };
}

/* ── ADMIN-ONLY — must move behind server auth in production ── */

export interface AdminContext {
  /** Placeholder flag only. A real implementation passes a session
      cookie (credentials: "include") and the SERVER verifies it. */
  adminSession: boolean;
}

/** Local UI flag — NOT a credential. Replace with real login flow. */
export function acquireLocalAdminSession(): AdminContext {
  return { adminSession: true };
}

function requireAdmin(ctx: AdminContext) {
  if (!ctx.adminSession) {
    throw new Error("Not authorized. Admin session required.");
  }
}

/**
 * Admin write — approve / reject / unpublish.
 * PRODUCTION: replace body with fetch() to your backend endpoint
 * that enforces authorization server-side. Keep this function as
 * the only place admin writes go through.
 */
export async function updateTestimonialStatus(
  id: string,
  status: TestimonialStatus,
  ctx: AdminContext
): Promise<Testimonial> {
  requireAdmin(ctx);
  await delay(400); // simulate network
  store = loadStore();
  const item = store.find((t) => t.id === id);
  if (!item) throw new Error("Testimonial not found.");
  item.status = status;
  persist();
  return { ...item };
}

/* ── PUBLIC SELECTOR — the only data the portfolio may consume ── */

/** Only approved testimonials may ever appear publicly. */
export function getApprovedTestimonials(
  all: Testimonial[]
): Testimonial[] {
  return all.filter((t) => t.status === "approved");
}

/* ── Small presentational helpers (reused by /admin) ── */

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
