-- Backfill profile.name from user.name where 0004 used email as placeholder name.
UPDATE "profile" p
SET "name" = u."name"
FROM "user" u
WHERE lower(u."email") = p."email"
  AND p."name" = p."email";
--> statement-breakpoint

-- Normalize any non-lowercase user emails (paranoia; OAuth providers may differ).
UPDATE "user" SET "email" = lower("email") WHERE "email" <> lower("email");
--> statement-breakpoint

-- Enforce lowercase invariant on user.email going forward.
ALTER TABLE "user" ADD CONSTRAINT "user_email_lower" CHECK ("email" = lower("email"));
