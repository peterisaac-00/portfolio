/* DELETE /api/testimonials/:id → ADMIN ONLY.
   Permanently removes the testimonial so it never
   reappears after refresh. */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { deleteTestimonial } from "../../server/db.js";
import {
  isAdminRequest,
  methodNotAllowed,
  unauthorized,
} from "../../server/auth.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    if (req.method !== "DELETE") {
      methodNotAllowed(res, ["DELETE"]);
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
    const removed = await deleteTestimonial(id);
    if (!removed) {
      res.status(404).json({ error: "Testimonial not found." });
      return;
    }
    res.status(200).json({ ok: true, id });
  } catch (err) {
    console.error("api/testimonials/[id] error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
}
