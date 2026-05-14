DROP INDEX IF EXISTS "user_team_idx";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN IF EXISTS "team";
