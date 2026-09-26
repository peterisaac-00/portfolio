/* ────────────────────────────────────────────
   Admin authentication for the API routes.
   - Password compared against ADMIN_PASSWORD with a
     constant-time comparison (SHA-256 both sides, then
     timingSafeEqual) — never ===.
   - Sessions are HMAC-signed tokens (ADMIN_SESSION_SECRET)
     carrying an expiry, stored in an HttpOnly, Secure (in
     production), SameSite=Strict cookie. Nothing readable
     by JS, no admin logic in the browser.
   - Login attempts are rate-limited per IP (in-memory).
     NOTE: serverless instances each hold their own map, so
     this blunts casual brute-forcing but is not a global
     counter. For stronger guarantees under load, move this
     to Vercel KV / Upstash Redis later.
   ──────────────────────────────────────────── */

import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const COOKIE_NAME = "admin_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/* Constant-time password check. Fail closed: any missing or
   malformed input, or a missing ADMIN_PASSWORD env var,
   simply returns false. */
export function verifyPassword(provided: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (
    !expected ||
    expected.length === 0 ||
    typeof provided !== "string" ||
    provided.length === 0
  ) {
    return false;
  }
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured.");
  return secret;
}

export function createSessionToken(): string {
  const expires = String(Date.now() + SESSION_TTL_MS);
  const nonce = randomBytes(16).toString("hex");
  const payload = expires + "." + nonce;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return payload + "." + sig;
}

export function verifySessionToken(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const expires = parts[0];
  const nonce = parts[1];
  const sig = parts[2];
  if (!/^\d+$/.test(expires)) return false;
  if (!/^[0-9a-f]{32}$/.test(nonce)) return false;
  if (!/^[0-9a-f]{64}$/.test(sig)) return false;
  if (Number(expires) < Date.now()) return false;
  let expected: Buffer;
  let actual: Buffer;
  try {
    expected = createHmac("sha256", getSecret())
      .update(expires + "." + nonce)
      .digest();
    actual = Buffer.from(sig, "hex");
  } catch {
    return false;
  }
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function getCookie(
  cookieHeader: string | undefined,
  name: string
): string | undefined {
  if (!cookieHeader) return undefined;
  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx < 0) continue;
    const key = pair.slice(0, idx).trim();
    if (key === name) return decodeURIComponent(pair.slice(idx + 1).trim());
  }
  return undefined;
}

export function isAdminRequest(req: VercelRequest): boolean {
  const header =
    typeof req.headers.cookie === "string" ? req.headers.cookie : undefined;
  const token = getCookie(header, COOKIE_NAME);
  if (!token) return false;
  try {
    return verifySessionToken(token);
  } catch {
    return false;
  }
}

function cookieFlags(maxAgeSec: number): string {
  const secure =
    process.env.NODE_ENV === "production" ? "; Secure" : "";
  return (
    COOKIE_NAME +
    "=" +
    "; HttpOnly; Path=/; Max-Age=" +
    String(maxAgeSec) +
    "; SameSite=Strict" +
    secure
  );
}

export function setSessionCookie(res: VercelResponse, token: string): void {
  res.setHeader(
    "Set-Cookie",
    cookieFlags(7 * 24 * 60 * 60).replace(COOKIE_NAME + "=", COOKIE_NAME + "=" + token)
  );
}

export function clearSessionCookie(res: VercelResponse): void {
  res.setHeader("Set-Cookie", cookieFlags(0));
}

/* ── Per-IP rate limiting (in-memory, per instance) ── */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size > 5000) buckets.clear();
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (bucket.count >= maxAttempts) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    const first = forwarded.split(",")[0].trim();
    if (first.length > 0) return first;
  }
  const remote =
    req.socket && typeof req.socket.remoteAddress === "string"
      ? req.socket.remoteAddress
      : "";
  return remote.length > 0 ? remote : "unknown";
}

/* ── Small shared HTTP helpers ── */

export function parseJsonBody(req: VercelRequest): unknown {
  const body = req.body;
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as unknown;
    } catch {
      return undefined;
    }
  }
  return body as unknown;
}

export function methodNotAllowed(
  res: VercelResponse,
  allowed: string[]
): void {
  res.setHeader("Allow", allowed.join(", "));
  res
    .status(405)
    .json({ error: "Method not allowed. Use " + allowed.join(" or ") + "." });
}

export function unauthorized(res: VercelResponse): void {
  res.status(401).json({ error: "Not authorized." });
}
