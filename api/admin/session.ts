/* /api/admin/session
   GET    → 200 { authenticated: true } with a valid cookie,
             401 { authenticated: false } without one.
   DELETE → clears the session cookie (sign out). */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  clearSessionCookie,
  isAdminRequest,
  methodNotAllowed,
} from "../../server/auth.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    if (req.method === "GET") {
      if (isAdminRequest(req)) {
        res.status(200).json({ authenticated: true });
      } else {
        res.status(401).json({ authenticated: false });
      }
      return;
    }

    if (req.method === "DELETE") {
      clearSessionCookie(res);
      res.status(200).json({ ok: true });
      return;
    }

    methodNotAllowed(res, ["GET", "DELETE"]);
  } catch (err) {
     
    console.error("api/admin/session error:", err);
    res.status(500).json({ error: "Internal server error." });
  }
}
