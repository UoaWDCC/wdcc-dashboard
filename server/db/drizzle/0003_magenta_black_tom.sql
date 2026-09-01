DROP INDEX "task_assignee_profile_pos_idx";--> statement-breakpoint
CREATE INDEX "task_assignee_profile_idx" ON "task_assignee" USING btree ("profile_email");--> statement-breakpoint
ALTER TABLE "task" DROP COLUMN "position";--> statement-breakpoint
ALTER TABLE "task_assignee" DROP COLUMN "position";