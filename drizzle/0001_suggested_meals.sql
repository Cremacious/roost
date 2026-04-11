ALTER TABLE "meal_suggestions"
  ADD COLUMN IF NOT EXISTS "target_slot_date" date,
  ADD COLUMN IF NOT EXISTS "target_slot_type" text DEFAULT 'dinner',
  ADD COLUMN IF NOT EXISTS "responded_by" text,
  ADD COLUMN IF NOT EXISTS "responded_at" timestamp,
  ADD COLUMN IF NOT EXISTS "accepted_meal_id" uuid,
  ADD COLUMN IF NOT EXISTS "accepted_slot_id" uuid,
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();

ALTER TABLE "meal_suggestions"
  ALTER COLUMN "status" SET DEFAULT 'suggested';

UPDATE "meal_suggestions"
SET "status" = CASE
  WHEN "status" = 'pending' THEN 'suggested'
  WHEN "status" = 'approved' THEN 'accepted'
  ELSE "status"
END
WHERE "status" IN ('pending', 'approved');

ALTER TABLE "meal_suggestions"
  ADD CONSTRAINT "meal_suggestions_accepted_meal_id_meals_id_fk"
  FOREIGN KEY ("accepted_meal_id") REFERENCES "meals"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "meal_suggestions"
  ADD CONSTRAINT "meal_suggestions_accepted_slot_id_meal_plan_slots_id_fk"
  FOREIGN KEY ("accepted_slot_id") REFERENCES "meal_plan_slots"("id") ON DELETE no action ON UPDATE no action;
