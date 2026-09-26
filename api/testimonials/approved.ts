/* GET /api/testimonials/approved → public, only approved entries.
   Powers the main site's Testimonials section. Safe to cache
   briefly at the edge; approvals take up to a minute to show. */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { listApprovedTestimonials } from "../../server/db.js";
import { methodNotAllowed } from "../../server/auth.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    if (req.method !== "GET") {
      methodNotAllowed(res, ["GET"]);
      return;
    }
    const items = await listApprovedTestimonials();
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=600"
    );
    res.status(200).json(items);
  } catch (err) {
     
    console.error("api/testimonials/approved error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
}
