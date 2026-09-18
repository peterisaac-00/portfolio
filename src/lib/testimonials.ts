/* ────────────────────────────────────────────
   TESTIMONIALS DATA LAYER
   No backend exists in this project yet (Vite + React SPA,
   no API routes, no DB, no auth). This file is the single
   source of truth for the testimonial shape so a future
   feedback page, the public portfolio, and /admin all share
   one model instead of drifting into duplicates.

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

/* Seed data so /admin can be reviewed without a backend.
   Replace with a fetch to your API once the feedback page exists. */
const seedTestimonials: Testimonial[] = [
  {
    id: "t-001",
    name: "Sarah Ahmed",
    company: "NilePay · Payment API",
    avatar: "SA",
    overallRating: 5,
    professionalismRating: 5,
    qualityRating: 5,
    communicationRating: 5,
    recommend: true,
    message:
      "Peter rebuilt our payment API and cut response times in half. Clear communication, solid docs, zero downtime on launch.",
    status: "pending",
    createdAt: "2026-09-02T10:15:00.000Z",
  },
  {
    id: "t-002",
    name: "Omar Khaled",
    company: "DataRouter",
    avatar: "OK",
    overallRating: 4,
    professionalismRating: 5,
    qualityRating: 4,
    communicationRating: 5,
    recommend: true,
    message:
      "Reliable backend work and fast debugging. The Kafka pipeline he set up has been running without issues for months.",
    status: "pending",
    createdAt: "2026-09-05T14:40:00.000Z",
  },
  {
    id: "t-003",
    name: "Lina Mostafa",
    avatar: "LM",
    overallRating: 5,
    professionalismRating: 4,
    qualityRating: 5,
    communicationRating: 4,
    recommend: true,
    message:
      "Great experience overall. He explained every trade-off before writing code and delivered ahead of schedule.",
    status: "pending",
    createdAt: "2026-09-10T09:05:00.000Z",
  },
  {
    id: "t-004",
    name: "David Mensah",
    company: "CloudVault pilot",
    avatar: "DM",
    overallRating: 5,
    professionalismRating: 5,
    qualityRating: 5,
    communicationRating: 5,
    recommend: true,
    message:
      "The distributed store Peter built survived every chaos test we threw at it. Extremely thorough engineer.",
    status: "approved",
    createdAt: "2026-08-18T11:30:00.000Z",
  },
  {
    id: "t-005",
    name: "Hana Youssef",
    company: "FlowEngine",
    avatar: "HY",
    overallRating: 4,
    professionalismRating: 4,
    qualityRating: 5,
    communicationRating: 4,
    recommend: true,
    message:
      "Workflow engine was well architected and easy to extend. Would happily work together again.",
    status: "approved",
    createdAt: "2026-08-27T16:20:00.000Z",
  },
  {
    id: "t-006",
    name: "Spam Entry",
    avatar: "SE",
    overallRating: 1,
    professionalismRating: 1,
    qualityRating: 1,
    communicationRating: 1,
    recommend: false,
    message: "This is an example of a low-quality submission to reject.",
    status: "rejected",
    createdAt: "2026-08-30T08:00:00.000Z",
  },
];

/* In-memory store (reset on reload) backed by the seed above.
   Swap these two functions for real API calls later. */
let store: Testimonial[] = seedTestimonials.map((t) => ({ ...t }));

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

/** Public read — used by any future public testimonial section. */
export async function fetchTestimonials(): Promise<Testimonial[]> {
  await delay(450); // simulate network
  return store.map((t) => ({ ...t }));
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
  const item = store.find((t) => t.id === id);
  if (!item) throw new Error("Testimonial not found.");
  item.status = status;
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
