CREATE TABLE "household_join_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"requester_user_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"resolved_by_user_id" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "household_join_requests" ADD CONSTRAINT "household_join_requests_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "household_join_requests_household_status_idx" ON "household_join_requests" USING btree ("household_id","status","created_at");
--> statement-breakpoint
CREATE INDEX "household_join_requests_requester_status_idx" ON "household_join_requests" USING btree ("requester_user_id","status","created_at");
