-- Canonical schema for the shared testimonials backend.
-- Applied automatically on first API call (see server/db.ts
-- ensureSchema), so manual migration is optional. Keep this
-- file in sync with SCHEMA_SQL in server/db.ts.

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
