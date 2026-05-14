ALTER TABLE "task_assignee" DROP CONSTRAINT "task_assignee_user_id_user_id_fk";--> statement-breakpoint
ALTER TABLE "task_assignee" DROP CONSTRAINT "task_assignee_task_id_user_id_pk";--> statement-breakpoint
DROP INDEX "task_assignee_user_pos_idx";--> statement-breakpoint
ALTER TABLE "task_assignee" ADD COLUMN "profile_email" text;--> statement-breakpoint
UPDATE "task_assignee" ta SET "profile_email" = u."email" FROM "user" u WHERE ta."user_id" = u."id";--> statement-breakpoint
DELETE FROM "task_assignee" WHERE "profile_email" IS NULL;--> statement-breakpoint
INSERT INTO "profile" ("email", "name") SELECT DISTINCT ta."profile_email", ta."profile_email" FROM "task_assignee" ta LEFT JOIN "profile" p ON p."email" = ta."profile_email" WHERE p."email" IS NULL;--> statement-breakpoint
ALTER TABLE "task_assignee" ALTER COLUMN "profile_email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "task_assignee" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "task_assignee" ADD CONSTRAINT "task_assignee_task_id_profile_email_pk" PRIMARY KEY ("task_id", "profile_email");--> statement-breakpoint
ALTER TABLE "task_assignee" ADD CONSTRAINT "task_assignee_profile_email_profile_email_fk" FOREIGN KEY ("profile_email") REFERENCES "public"."profile"("email") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "task_assignee_profile_pos_idx" ON "task_assignee" USING btree ("profile_email","position");
