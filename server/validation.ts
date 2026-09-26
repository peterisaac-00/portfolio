/* ────────────────────────────────────────────
   Server-side validation for testimonial input.
   Runs inside Vercel Serverless Functions — never trust
   client-submitted data as-is, even though the /feedback
   form validates in the browser too.
   ──────────────────────────────────────────── */

export interface ValidTestimonialInput {
  name: string;
  company?: string;
  overallRating: number;
  professionalismRating: number;
  qualityRating: number;
  communicationRating: number;
  recommend: boolean;
  message: string;
}

export type ValidationResult =
  | { ok: true; value: ValidTestimonialInput }
  | { ok: false; error: string };

export type TestimonialStatus = "pending" | "approved" | "rejected";

const NAME_MAX = 100;
const COMPANY_MAX = 120;
const MESSAGE_MAX = 1000;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isIntInRange(v: unknown, min: number, max: number): v is number {
  return (
    typeof v === "number" && Number.isInteger(v) && v >= min && v <= max
  );
}

export function validateNewTestimonial(body: unknown): ValidationResult {
  if (!isRecord(body)) return { ok: false, error: "Invalid request body." };

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length === 0) return { ok: false, error: "Name is required." };
  if (name.length > NAME_MAX) {
    return { ok: false, error: "Name must be at most 100 characters." };
  }

  let company: string | undefined;
  const rawCompany = body.company;
  if (rawCompany !== undefined && rawCompany !== null && rawCompany !== "") {
    if (typeof rawCompany !== "string") {
      return { ok: false, error: "Company must be a string." };
    }
    const trimmed = rawCompany.trim();
    if (trimmed.length > COMPANY_MAX) {
      return { ok: false, error: "Company must be at most 120 characters." };
    }
    company = trimmed.length > 0 ? trimmed : undefined;
  }

  const ratings: Array<[string, unknown]> = [
    ["overallRating", body.overallRating],
    ["professionalismRating", body.professionalismRating],
    ["qualityRating", body.qualityRating],
    ["communicationRating", body.communicationRating],
  ];
  for (const [field, value] of ratings) {
    if (!isIntInRange(value, 1, 5)) {
      return { ok: false, error: field + " must be an integer from 1 to 5." };
    }
  }

  if (typeof body.recommend !== "boolean") {
    return { ok: false, error: "Recommend must be true or false." };
  }

  const message =
    typeof body.message === "string" ? body.message.trim() : "";
  if (message.length === 0) {
    return { ok: false, error: "Message is required." };
  }
  if (message.length > MESSAGE_MAX) {
    return { ok: false, error: "Message must be at most 1000 characters." };
  }

  return {
    ok: true,
    value: {
      name,
      company,
      overallRating: body.overallRating as number,
      professionalismRating: body.professionalismRating as number,
      qualityRating: body.qualityRating as number,
      communicationRating: body.communicationRating as number,
      recommend: body.recommend,
      message,
    },
  };
}

export function validateStatus(v: unknown): v is TestimonialStatus {
  return v === "approved" || v === "rejected";
}
