CREATE INDEX IF NOT EXISTS "household_members_user_joined_idx"
  ON "household_members" USING btree ("user_id", "joined_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "member_permissions_user_permission_idx"
  ON "member_permissions" USING btree ("user_id", "permission");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chore_completions_chore_completed_at_idx"
  ON "chore_completions" USING btree ("chore_id", "completed_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chores_household_next_due_idx"
  ON "chores" USING btree ("household_id", "next_due_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chores_household_assigned_to_idx"
  ON "chores" USING btree ("household_id", "assigned_to");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "grocery_items_list_checked_idx"
  ON "grocery_items" USING btree ("list_id", "checked");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "grocery_items_household_created_idx"
  ON "grocery_items" USING btree ("household_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "grocery_lists_household_created_idx"
  ON "grocery_lists" USING btree ("household_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_household_due_date_idx"
  ON "tasks" USING btree ("household_id", "due_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_household_completed_idx"
  ON "tasks" USING btree ("household_id", "completed");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expense_splits_expense_user_idx"
  ON "expense_splits" USING btree ("expense_id", "user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expense_splits_user_settled_idx"
  ON "expense_splits" USING btree ("user_id", "settled");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenses_household_created_idx"
  ON "expenses" USING btree ("household_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenses_household_paid_by_idx"
  ON "expenses" USING btree ("household_id", "paid_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "household_activity_household_created_idx"
  ON "household_activity" USING btree ("household_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meal_plan_slots_household_slot_date_idx"
  ON "meal_plan_slots" USING btree ("household_id", "slot_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meals_household_created_idx"
  ON "meals" USING btree ("household_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminders_household_next_remind_idx"
  ON "reminders" USING btree ("household_id", "next_remind_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminders_household_completed_idx"
  ON "reminders" USING btree ("household_id", "completed");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "request_rate_limits_reset_at_idx"
  ON "request_rate_limits" USING btree ("reset_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_queue_sent_at_idx"
  ON "notification_queue" USING btree ("sent", "sent_at");
