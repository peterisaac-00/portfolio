/* PATCH /api/testimonials/:id/status → ADMIN ONLY.
   Body: { "status": "approved" | "rejected" } */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { updateTestimonialStatus } from "../../../server/db.js";
import {
  isAdminRequest,
  methodNotAllowed,
  parseJsonBody,
  unauthorized,
} from "../../../server/auth.js";
import { validateStatus } from "../../../server/validation.js";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    if (req.method !== "PATCH") {
      methodNotAllowed(res, ["PATCH"]);
      return;
    }
    if (!isAdminRequest(req)) {
      unauthorized(res);
      return;
    }
    const id = req.query.id;
    if (typeof id !== "string" || id.length === 0 || id.length > 128) {
      res.status(400).json({ error: "Invalid testimonial id." });
      return;
    }
    const body = parseJsonBody(req);
    const status = isRecord(body) ? body.status : undefined;
    if (!validateStatus(status)) {
      res
        .status(400)
        .json({ error: 'Status must be "approved" or "rejected".' });
      return;
    }
    const updated = await updateTestimonialStatus(id, status);
    if (!updated) {
      res.status(404).json({ error: "Testimonial not found." });
      return;
    }
    res.status(200).json(updated);
  } catch (err) {
     
    console.error("api/testimonials/[id]/status error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
}
