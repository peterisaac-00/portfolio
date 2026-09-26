/* GET  /api/testimonials → ADMIN ONLY, all testimonials.
   POST /api/testimonials → public, creates a "pending" entry. */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  createTestimonial,
  listTestimonials,
} from "../../server/db";
import {
  checkRateLimit,
  getClientIp,
  isAdminRequest,
  methodNotAllowed,
  parseJsonBody,
  unauthorized,
} from "../../server/auth";
import { validateNewTestimonial } from "../../server/validation";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    if (req.method === "GET") {
      if (!isAdminRequest(req)) {
        unauthorized(res);
        return;
      }
      const items = await listTestimonials();
      res.status(200).json(items);
      return;
    }

    if (req.method === "POST") {
      // Light per-IP throttle on the public write path.
      const ip = getClientIp(req);
      const limit = checkRateLimit("submit:" + ip, 20, 60 * 60 * 1000);
      if (!limit.allowed) {
        res.setHeader("Retry-After", String(limit.retryAfterSec));
        res
          .status(429)
          .json({ error: "Too many submissions. Please try again later." });
        return;
      }
      const result = validateNewTestimonial(parseJsonBody(req));
      if (!result.ok) {
        res.status(400).json({ error: result.error });
        return;
      }
      const item = await createTestimonial(result.value);
      res.status(201).json(item);
      return;
    }

    methodNotAllowed(res, ["GET", "POST"]);
  } catch (err) {
     
    console.error("api/testimonials error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
}
