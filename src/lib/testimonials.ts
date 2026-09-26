/* ────────────────────────────────────────────
   TESTIMONIALS DATA LAYER — thin fetch client over the
   shared backend (Vercel Serverless Functions + Postgres).
   This file is the single source of truth for the
   testimonial shape so the feedback page, the public
   portfolio, and /admin all share one model.

   STORAGE: shared Postgres table `testimonials` — a
   submission from a client's device on /feedback is
   visible on the admin's own device on /admin. No
   localStorage anywhere in this file.

   SECURITY:
   - Admin endpoints send the HttpOnly session cookie
     (credentials: "include") and the SERVER verifies it.
     There is deliberately no admin logic in the browser.
   - No passwords, secrets, or connection strings here —
     those live in Vercel environment variables only.
   ──────────────────────────────────────────── */

export type TestimonialStatus = "pending" | "approved" | "rejected";

export interface Testimonial {
  id: string;
  name: string;
  company?: string;
  /** Initials (e.g. "WA"), computed server-side. Rendered as
      a local circle avatar so no external image host is needed
      (index.html CSP only allows img-src 'self' data:). */
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

/** Input accepted from the /feedback form (no id/status — the
    server assigns those so every entry starts as "pending"). */
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

/** Thrown for non-2xx API responses. `status` lets callers
    distinguish 401 (show login) from other failures. */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiError(0, "Network error. Check your connection and try again.");
  }
  let data: unknown = undefined;
  try {
    data = await res.json();
  } catch {
    data = undefined;
  }
  if (!res.ok) {
    const message =
      isRecord(data) && typeof data.error === "string"
        ? data.error
        : "Request failed. Please try again.";
    throw new ApiError(res.status, message);
  }
  return data as T;
}

/** Admin read — all testimonials regardless of status.
    Requires a valid admin session cookie (401 otherwise). */
export function fetchTestimonials(): Promise<Testimonial[]> {
  return request<Testimonial[]>("/api/testimonials", {
    credentials: "include",
  });
}

/** Public write — used by /feedback. The server validates
    and always stores the entry as "pending". */
export function submitTestimonial(
  input: NewTestimonialInput
): Promise<Testimonial> {
  return request<Testimonial>("/api/testimonials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

/**
 * Admin write — approve / reject / unpublish.
 * Authorization is enforced server-side via the session
 * cookie; the browser only forwards the request.
 */
export function updateTestimonialStatus(
  id: string,
  status: TestimonialStatus
): Promise<Testimonial> {
  return request<Testimonial>(
    "/api/testimonials/" + encodeURIComponent(id) + "/status",
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }
  );
}

/** Public read — only approved testimonials. Used by the
    main site's Testimonials section. */
export function fetchApprovedTestimonials(): Promise<Testimonial[]> {
  return request<Testimonial[]>("/api/testimonials/approved");
}

/* ── Admin session ── */

/** True when the session cookie is valid, false on 401.
    Other failures throw so callers can show an error. */
export async function checkAdminSession(): Promise<boolean> {
  try {
    await request<{ authenticated: boolean }>("/api/admin/session", {
      credentials: "include",
    });
    return true;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return false;
    throw err;
  }
}

/** Log in with the admin password. Throws ApiError (401 for a
    wrong password, 429 when rate-limited). */
export async function adminLogin(password: string): Promise<void> {
  await request<{ ok: boolean }>("/api/admin/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
}

/** Sign out — clears the session cookie server-side. */
export async function adminLogout(): Promise<void> {
  await request<{ ok: boolean }>("/api/admin/session", {
    method: "DELETE",
    credentials: "include",
  });
}

/* ── PUBLIC SELECTOR — extra client-side guard so only
      approved testimonials can ever render publicly,
      even if a response were tampered with. ── */

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
