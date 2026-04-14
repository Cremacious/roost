CREATE TABLE IF NOT EXISTS "request_rate_limits" (
  "scope" text NOT NULL,
  "key" text NOT NULL,
  "count" integer NOT NULL DEFAULT 1,
  "reset_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "request_rate_limits_scope_key_pk" PRIMARY KEY("scope", "key")
);
