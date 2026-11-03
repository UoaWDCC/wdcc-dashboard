CREATE TYPE "public"."check_in_flag" AS ENUM('follow_up', 'inquire');--> statement-breakpoint
CREATE TABLE "check_in" (
	"profile_email" text NOT NULL,
	"year" smallint NOT NULL,
	"month" smallint NOT NULL,
	"checked" boolean DEFAULT false NOT NULL,
	"flag" "check_in_flag",
	"note" text,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "check_in_profile_email_year_month_pk" PRIMARY KEY("profile_email","year","month"),
	CONSTRAINT "check_in_month_range" CHECK ("check_in"."month" between 3 and 10)
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_profile_email_profile_email_fk" FOREIGN KEY ("profile_email") REFERENCES "public"."profile"("email") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;