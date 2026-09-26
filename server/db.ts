/* ────────────────────────────────────────────
   Postgres data access for testimonials.
   Reads POSTGRES_URL from the environment (set as a Vercel
   environment variable — never committed, never exposed to
   the client bundle). Works with Supabase Postgres or
   Vercel Postgres connection strings alike.

   Serverless notes:
   - The pool is cached on globalThis so warm invocations
     reuse connections instead of reconnecting every time.
   - max: 1 keeps a single client per function instance.
   - ensureSchema() runs CREATE TABLE IF NOT EXISTS lazily
     (cached promise), so the first deploy works without a
     separate migration step. The canonical schema also lives
     in db/schema.sql for review / local setup.
   ──────────────────────────────────────────── */

import { randomUUID } from "crypto";
import { Pool, type QueryResult } from "pg";
import type { TestimonialStatus, ValidTestimonialInput } from "./validation.js";

export interface DbTestimonial {
  id: string;
  name: string;
  company?: string;
  avatar: string;
  overallRating: number;
  professionalismRating: number;
  qualityRating: number;
  communicationRating: number;
  recommend: boolean;
  message: string;
  status: TestimonialStatus;
  createdAt: string;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS testimonials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  avatar TEXT NOT NULL,
  overall_rating SMALLINT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  professionalism_rating SMALLINT NOT NULL CHECK (professionalism_rating BETWEEN 1 AND 5),
  quality_rating SMALLINT NOT NULL CHECK (quality_rating BETWEEN 1 AND 5),
  communication_rating SMALLINT NOT NULL CHECK (communication_rating BETWEEN 1 AND 5),
  recommend BOOLEAN NOT NULL,
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 1000),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS testimonials_status_created_idx
  ON testimonials (status, created_at DESC);
`;

declare global {
  var __portfolioPgPool: Pool | undefined;
}

function getPool(): Pool {
  if (!globalThis.__portfolioPgPool) {
    const connectionString = process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error("POSTGRES_URL is not configured.");
    }
    globalThis.__portfolioPgPool = new Pool({
      connectionString,
      max: 1,
      // Hosted Postgres (Supabase / Vercel) requires TLS. Local dev
      // can opt out with POSTGRES_SSLMODE=disable.
      ssl:
        process.env.POSTGRES_SSLMODE === "disable"
          ? false
          : { rejectUnauthorized: false },
    });
    // An idle-connection termination from the DB/pooler side emits
    // "error" on the pool — without a listener that is an uncaught
    // exception and crashes the whole serverless function.
    globalThis.__portfolioPgPool.on("error", (err: unknown) => {
      console.error("Unexpected pg pool error (idle client):", err);
    });
  }
  return globalThis.__portfolioPgPool;
}

let schemaPromise: Promise<void> | undefined;

export function ensureSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = getPool()
      .query(SCHEMA_SQL)
      .then(
        () => undefined,
        (err: unknown) => {
          schemaPromise = undefined;
          throw err;
        }
      );
  }
  return schemaPromise;
}

function mapRow(row: QueryResult["rows"][number]): DbTestimonial {
  const item: DbTestimonial = {
    id: String(row.id),
    name: String(row.name),
    avatar: String(row.avatar),
    overallRating: Number(row.overall_rating),
    professionalismRating: Number(row.professionalism_rating),
    qualityRating: Number(row.quality_rating),
    communicationRating: Number(row.communication_rating),
    recommend: row.recommend === true,
    message: String(row.message),
    status: row.status as TestimonialStatus,
    createdAt: new Date(row.created_at).toISOString(),
  };
  if (row.company !== null && row.company !== undefined) {
    const company = String(row.company);
    if (company.length > 0) item.company = company;
  }
  return item;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export async function createTestimonial(
  input: ValidTestimonialInput
): Promise<DbTestimonial> {
  await ensureSchema();
  const id =
    "t-" + Date.now().toString(36) + "-" + randomUUID().slice(0, 8);
  const result = await getPool().query(
    `INSERT INTO testimonials
       (id, name, company, avatar, overall_rating, professionalism_rating,
        quality_rating, communication_rating, recommend, message, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending')
     RETURNING *`,
    [
      id,
      input.name,
      input.company ?? null,
      initials(input.name),
      input.overallRating,
      input.professionalismRating,
      input.qualityRating,
      input.communicationRating,
      input.recommend,
      input.message,
    ]
  );
  return mapRow(result.rows[0]);
}

export async function listTestimonials(): Promise<DbTestimonial[]> {
  await ensureSchema();
  const result = await getPool().query(
    "SELECT * FROM testimonials ORDER BY created_at DESC"
  );
  return result.rows.map(mapRow);
}

export async function listApprovedTestimonials(): Promise<DbTestimonial[]> {
  await ensureSchema();
  const result = await getPool().query(
    "SELECT * FROM testimonials WHERE status = 'approved' ORDER BY created_at DESC"
  );
  return result.rows.map(mapRow);
}

export async function updateTestimonialStatus(
  id: string,
  status: TestimonialStatus
): Promise<DbTestimonial | null> {
  await ensureSchema();
  const result = await getPool().query(
    "UPDATE testimonials SET status = $2 WHERE id = $1 RETURNING *",
    [id, status]
  );
  if (result.rows.length === 0) return null;
  return mapRow(result.rows[0]);
}
