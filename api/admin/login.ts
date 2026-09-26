/* POST /api/admin/login → { "password": "..." }.
   Constant-time password check; on success sets the signed
   HttpOnly session cookie. Rate-limited per IP (5/min) to
   resist brute-forcing. */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  checkRateLimit,
  createSessionToken,
  getClientIp,
  methodNotAllowed,
  parseJsonBody,
  setSessionCookie,
  verifyPassword,
} from "../../server/auth";

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    if (req.method !== "POST") {
      methodNotAllowed(res, ["POST"]);
      return;
    }

    const ip = getClientIp(req);
    const limit = checkRateLimit("login:" + ip, 5, 60 * 1000);
    if (!limit.allowed) {
      res.setHeader("Retry-After", String(limit.retryAfterSec));
      res.status(429).json({ error: "Too many attempts. Try again shortly." });
      return;
    }

    const body = parseJsonBody(req);
    const password = isRecord(body) ? body.password : undefined;

    if (!process.env.ADMIN_PASSWORD) {
       
      console.error("api/admin/login: ADMIN_PASSWORD is not configured.");
      await delay(300);
      res.status(401).json({ error: "Invalid password." });
      return;
    }

    if (!verifyPassword(password)) {
      // Small uniform delay so failures don't return instantly.
      await delay(300);
      res.status(401).json({ error: "Invalid password." });
      return;
    }

    setSessionCookie(res, createSessionToken());
    res.status(200).json({ ok: true });
  } catch (err) {
     
    console.error("api/admin/login error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
}
