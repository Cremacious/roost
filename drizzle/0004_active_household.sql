ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "active_household_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_active_household_id_households_id_fk'
  ) THEN
    ALTER TABLE "users"
    ADD CONSTRAINT "users_active_household_id_households_id_fk"
    FOREIGN KEY ("active_household_id") REFERENCES "public"."households"("id")
    ON DELETE set null ON UPDATE no action;
  END IF;
END $$;

UPDATE "users" AS u
SET "active_household_id" = latest."household_id"
FROM (
  SELECT DISTINCT ON ("user_id")
    "user_id",
    "household_id"
  FROM "household_members"
  WHERE "expires_at" IS NULL OR "expires_at" > NOW()
  ORDER BY "user_id", "joined_at" DESC
) AS latest
WHERE u."id" = latest."user_id"
  AND u."active_household_id" IS NULL;
