CREATE TYPE "public"."profile_kind" AS ENUM('personal', 'shared');--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "kind" "profile_kind" DEFAULT 'personal' NOT NULL;
