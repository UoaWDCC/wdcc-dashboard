CREATE TABLE "profile" (
	"email" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"team" "task_team",
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	CONSTRAINT "profile_email_lower" CHECK ("profile"."email" = lower("profile"."email"))
);
--> statement-breakpoint
ALTER TABLE "allowed_domain" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "allowed_email" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_team" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "allowed_domain" CASCADE;--> statement-breakpoint
DROP TABLE "allowed_email" CASCADE;--> statement-breakpoint
DROP TABLE "user_team" CASCADE;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "team" "task_team";--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_team_idx" ON "user" USING btree ("team");